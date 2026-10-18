import { PrismaClient, Prisma } from '@prisma/client';
import { redis } from '../lib/redis';
import { isCooperativeManager } from '../lib/accessControl';
import { formatStroopsToDecimal, parseDecimalToStroops } from '../lib/money';

const prisma = new PrismaClient();

const STATS_CACHE_TTL_SECONDS = 5 * 60;

export interface CooperativeStatsDateRange {
  start?: Date;
  end?: Date;
}

export interface CooperativeStats {
  cooperativeId: string;
  range: {
    start: string | null;
    end: string | null;
  };
  volume: number;
  activeTrades: number;
  totalTrades: number;
  disputedTrades: number;
  disputeRate: number;
  memberTrustScores: {
    memberId: string;
    trustScore: number;
  }[];
  averageMemberTrustScore: number;
}

export class CooperativeStatsAccessError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'CooperativeStatsAccessError';
  }
}

function buildStatsCacheKey(cooperativeId: string, range: CooperativeStatsDateRange): string {
  const start = range.start ? range.start.toISOString() : 'none';
  const end = range.end ? range.end.toISOString() : 'none';
  return `cooperative:stats:${cooperativeId}:${start}:${end}`;
}

function buildTradeDateFilter(range: CooperativeStatsDateRange): Prisma.TradeWhereInput {
  const createdAt: Prisma.DateTimeFilter = {};
  if (range.start) {
    createdAt.gte = range.start;
  }
  if (range.end) {
    createdAt.lte = range.end;
  }
  return Object.keys(createdAt).length > 0 ? { createdAt } : {};
}

export async function getCooperativeStats(
  cooperativeId: string,
  requesterId: string,
  range: CooperativeStatsDateRange = {},
): Promise<CooperativeStats> {
  const isManager = await isCooperativeManager(cooperativeId, requesterId);
  if (!isManager) {
    throw new CooperativeStatsAccessError();
  }

  const cacheKey = buildStatsCacheKey(cooperativeId, range);
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as CooperativeStats;
  }

  const dateFilter = buildTradeDateFilter(range);

  const [trades, members] = await Promise.all([
    prisma.trade.findMany({
      where: {
        cooperativeId,
        ...dateFilter,
      },
      select: {
        id: true,
        amount: true,
        status: true,
      },
    }),
    prisma.cooperativeMember.findMany({
      where: { cooperativeId },
      select: {
        userId: true,
        trustScore: true,
      },
    }),
  ]);

  const totalTrades = trades.length;
  // Summed in integer stroops so the total stays exact; only the final value is
  // converted to a number at the response boundary.
  const volumeStroops = trades.reduce((sum, trade) => {
    try {
      return sum + parseDecimalToStroops(String(trade.amount ?? 0));
    } catch {
      // A malformed row must not take down the whole stats call.
      return sum;
    }
  }, 0n);
  const volume = Number(formatStroopsToDecimal(volumeStroops));
  const activeTrades = trades.filter((trade) => trade.status === 'ACTIVE').length;
  const disputedTrades = trades.filter((trade) => trade.status === 'DISPUTED').length;
  const disputeRate = totalTrades > 0 ? disputedTrades / totalTrades : 0;

  const memberTrustScores = members.map((member) => ({
    memberId: member.userId,
    trustScore: Number(member.trustScore ?? 0),
  }));

  const averageMemberTrustScore =
    memberTrustScores.length > 0
      ? memberTrustScores.reduce((sum, member) => sum + member.trustScore, 0) /
        memberTrustScores.length
      : 0;

  const stats: CooperativeStats = {
    cooperativeId,
    range: {
      start: range.start ? range.start.toISOString() : null,
      end: range.end ? range.end.toISOString() : null,
    },
    volume,
    activeTrades,
    totalTrades,
    disputedTrades,
    disputeRate,
    memberTrustScores,
    averageMemberTrustScore,
  };

  await redis.set(cacheKey, JSON.stringify(stats), 'EX', STATS_CACHE_TTL_SECONDS);

  return stats;
}
