import { Prisma, PrismaClient, TradeStatus } from '@prisma/client';
import { prisma as defaultPrisma } from '../lib/db';
import { appLogger } from '../middleware/logger';
import { notificationQueue } from '../jobs/queue';
import { recordTradeFunnelEvent } from '../lib/metrics';

export interface SweepResult {
  scanned: number;
  expired: number;
  errors: number;
}

/** Non-terminal statuses eligible for expiry sweep. */
const EXPIRABLE_STATUSES: TradeStatus[] = [
  TradeStatus.CREATED,
  TradeStatus.FUNDED,
  TradeStatus.PENDING_SIGNATURE,
];

export class TradeExpiryService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  /**
   * Scans for trades whose `expiresAt` has passed and whose status is still
   * non-terminal. Marks each as EXPIRED and enqueues buyer/seller notifications.
   * Idempotent: already-expired trades are skipped.
   *
   * The status flip is a single batched UPDATE ... FROM (VALUES ...) instead of
   * one updateMany per trade. Each row still carries its own `version` and
   * status guard, so a trade modified since the scan is not flipped and is not
   * notified. A 500-trade batch costs 2 DB round-trips for the sweep (findMany +
   * batched UPDATE) instead of 501 (findMany + 500 sequential updateMany).
   */
  async sweepExpiredTrades(batchSize = 100): Promise<SweepResult> {
    const now = new Date();
    const result: SweepResult = { scanned: 0, expired: 0, errors: 0 };

    const stale = await this.db.trade.findMany({
      where: {
        expiresAt: { lte: now },
        status: { in: EXPIRABLE_STATUSES },
        expiredAt: null,
      },
      take: batchSize,
      select: {
        id: true,
        tradeId: true,
        buyerAddress: true,
        sellerAddress: true,
        amountUsdc: true,
        status: true,
        version: true,
      },
      orderBy: { expiresAt: 'asc' },
    });

    result.scanned = stale.length;

    if (stale.length === 0) return result;

    let flippedIds: Set<number>;
    try {
      const flipped = await this.db.$queryRaw<{ id: number }[]>(Prisma.sql`
        UPDATE "Trade" AS t
        SET "status" = ${TradeStatus.EXPIRED}::"TradeStatus",
            "expiredAt" = ${now},
            "updatedAt" = ${now},
            "version" = t."version" + 1
        FROM (VALUES ${Prisma.join(stale.map((t) => Prisma.sql`(${t.id}::int, ${t.version}::int)`))}) AS v("id", "version")
        WHERE t."id" = v."id"
          AND t."version" = v."version"
          AND t."status" IN (${Prisma.join(EXPIRABLE_STATUSES.map((s) => Prisma.sql`${s}::"TradeStatus"`))})
        RETURNING t."id"
      `);
      flippedIds = new Set(flipped.map((row) => row.id));
    } catch (err) {
      result.errors = stale.length;
      appLogger.error({ batchSize: stale.length, err }, 'Sweeper failed to expire trade batch');
      return result;
    }

    for (const trade of stale) {
      // Lost the optimistic lock (changed since the scan): leave it for the next tick.
      if (!flippedIds.has(trade.id)) continue;

      try {
        await Promise.all([
          notificationQueue.add('trade-expired-buyer', {
            userAddress: trade.buyerAddress,
            type: 'in_app',
            title: 'Trade Expired',
            message: `Trade ${trade.tradeId} has expired. A refund will be processed shortly.`,
            metadata: { tradeId: trade.tradeId, amountUsdc: trade.amountUsdc },
          }),
          notificationQueue.add('trade-expired-seller', {
            userAddress: trade.sellerAddress,
            type: 'in_app',
            title: 'Trade Expired',
            message: `Trade ${trade.tradeId} has expired and was not completed.`,
            metadata: { tradeId: trade.tradeId },
          }),
        ]);

        result.expired++;
        recordTradeFunnelEvent("expired");
        appLogger.info({ tradeId: trade.tradeId, previousStatus: trade.status }, 'Trade expired by sweeper');
      } catch (err) {
        result.errors++;
        appLogger.error({ tradeId: trade.tradeId, err }, 'Sweeper failed to expire trade');
      }
    }

    return result;
  }

  /** Returns trades that have been marked EXPIRED but not yet refunded on-chain. */
  async getPendingRefunds(limit = 50) {
    return this.db.trade.findMany({
      where: { status: TradeStatus.EXPIRED },
      take: limit,
      orderBy: { expiredAt: 'asc' },
      select: {
        tradeId: true,
        buyerAddress: true,
        amountUsdc: true,
        expiredAt: true,
      },
    });
  }
}

export const tradeExpiryService = new TradeExpiryService();
