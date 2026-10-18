import { appLogger } from "../middleware/logger";

export type AnalyticsEventName =
  | "trade.created"
  | "trade.funded"
  | "trade.confirmed"
  | "trade.disputed"
  | "trade.resolved"
  | "trade.cancelled"
  | "user.registered"
  | "user.connected_wallet";

export interface AnalyticsEvent {
  event: AnalyticsEventName;
  timestamp: string;
  userId: string;
  tradeId?: string;
  metadata?: Record<string, unknown>;
}

export interface CooperativeStatsDateRange {
  start?: string | Date;
  end?: string | Date;
}

export interface CooperativeStats {
  cooperativeId: string;
  range: { start: string | null; end: string | null };
  volume: number;
  activeTrades: number;
  disputeRate: number;
  memberTrustScores: Array<{ userId: string; trustScore: number }>;
  generatedAt: string;
}

/**
 * Minimal shape of a trade row needed to compute cooperative aggregates.
 * Kept structural so callers can pass DB rows without extra mapping.
 */
export interface CooperativeTradeRecord {
  id: string;
  cooperativeId: string;
  amount: number;
  status: string;
  createdAt: string | Date;
  completedAt?: string | Date | null;
  disputed?: boolean;
}

/**
 * One row per UTC day (bucketed by trade creation date). Time-to-settle is
 * measured from creation to `completedAt` for trades that have completed.
 */
export interface DailyMetricsRow {
  date: string;
  trades: number;
  gmv: number;
  disputedTrades: number;
  disputeRate: number;
  settledTrades: number;
  avgTimeToSettleHours: number | null;
}

export interface CooperativeMemberRecord {
  userId: string;
  cooperativeId: string;
  trustScore: number;
}

/**
 * Data source used to compute cooperative stats. The default implementation
 * returns empty results so the service works without a DB binding; production
 * wiring can override these methods (or pass a custom source) to read from the
 * trade and member tables.
 */
export interface CooperativeStatsSource {
  listTrades(cooperativeId: string): Promise<CooperativeTradeRecord[]>;
  listMembers(cooperativeId: string): Promise<CooperativeMemberRecord[]>;
}

/**
 * Minimal Redis-like cache contract. Compatible with ioredis / node-redis
 * clients without importing them here.
 */
export interface StatsCache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: "EX", ttlSeconds: number): Promise<unknown>;
}

const ACTIVE_TRADE_STATUSES = new Set([
  "created",
  "funded",
  "confirmed",
  "disputed",
]);

const STATS_CACHE_TTL_SECONDS = 300;

export class AnalyticsService {
  private statsSource: CooperativeStatsSource = {
    listTrades: async () => [],
    listMembers: async () => [],
  };

  private statsCache: StatsCache | null = null;

  /**
   * Wire the data source used by {@link getCooperativeStats}. Call once at
   * startup with a DB-backed implementation.
   */
  setCooperativeStatsSource(source: CooperativeStatsSource): void {
    this.statsSource = source;
  }

  /**
   * Wire the Redis client used to cache cooperative stats for 5 minutes.
   */
  setStatsCache(cache: StatsCache | null): void {
    this.statsCache = cache;
  }

  /**
   * Fire-and-forget event tracking. Never throws — errors are logged only.
   */
  track(
    event: AnalyticsEventName,
    userId: string,
    tradeId?: string,
    metadata?: Record<string, unknown>,
  ): void {
    const payload: AnalyticsEvent = {
      event,
      timestamp: new Date().toISOString(),
      userId,
      ...(tradeId !== undefined && { tradeId }),
      ...(metadata !== undefined && { metadata }),
    };

    // Structured log — picked up by any log aggregator
    appLogger.info({ analytics: payload }, "analytics_event");

    // Optional Postgres persistence (best-effort, override persistEvent to enable)
    this.persistEvent(payload).catch((err: unknown) =>
      appLogger.warn({ err, event }, "analytics_event: db write failed"),
    );
  }

  /**
   * Compute aggregate stats for a cooperative over an optional date range.
   * Results are cached in Redis for 5 minutes when a cache is configured.
   */
  async getCooperativeStats(
    cooperativeId: string,
    range: CooperativeStatsDateRange = {},
  ): Promise<CooperativeStats> {
    const start = normalizeDate(range.start);
    const end = normalizeDate(range.end);
    const cacheKey = buildStatsCacheKey(cooperativeId, start, end);

    if (this.statsCache) {
      try {
        const cached = await this.statsCache.get(cacheKey);
        if (cached) {
          return JSON.parse(cached) as CooperativeStats;
        }
      } catch (err) {
        appLogger.warn({ err, cacheKey }, "cooperative_stats: cache read failed");
      }
    }

    const [trades, members] = await Promise.all([
      this.statsSource.listTrades(cooperativeId),
      this.statsSource.listMembers(cooperativeId),
    ]);

    const inRange = trades.filter((trade) => isWithinRange(trade.createdAt, start, end));

    const volume = inRange.reduce((sum, trade) => sum + (trade.amount ?? 0), 0);
    const activeTrades = inRange.filter((trade) =>
      ACTIVE_TRADE_STATUSES.has(trade.status),
    ).length;
    const disputedTrades = inRange.filter(
      (trade) => trade.disputed === true || trade.status === "disputed",
    ).length;
    const disputeRate = inRange.length === 0 ? 0 : disputedTrades / inRange.length;

    const memberTrustScores = members
      .filter((member) => member.cooperativeId === cooperativeId)
      .map((member) => ({ userId: member.userId, trustScore: member.trustScore }));

    const stats: CooperativeStats = {
      cooperativeId,
      range: {
        start: start ? start.toISOString() : null,
        end: end ? end.toISOString() : null,
      },
      volume,
      activeTrades,
      disputeRate,
      memberTrustScores,
      generatedAt: new Date().toISOString(),
    };

    if (this.statsCache) {
      try {
        await this.statsCache.set(
          cacheKey,
          JSON.stringify(stats),
          "EX",
          STATS_CACHE_TTL_SECONDS,
        );
      } catch (err) {
        appLogger.warn({ err, cacheKey }, "cooperative_stats: cache write failed");
      }
    }

    return stats;
  }

  /**
   * Daily trade metrics (trades, GMV, dispute rate, time-to-settle) for a
   * cooperative over an optional date range.
   */
  async getCooperativeDailyMetrics(
    cooperativeId: string,
    range: CooperativeStatsDateRange = {},
  ): Promise<DailyMetricsRow[]> {
    const trades = await this.statsSource.listTrades(cooperativeId);
    return buildDailyMetrics(
      trades.filter((trade) => trade.cooperativeId === cooperativeId),
      range,
    );
  }

  /**
   * Override in production to persist to Postgres once an AnalyticsEvent
   * table exists in the schema. The default is a no-op so the service works
   * without a DB migration.
   */
  protected async persistEvent(_event: AnalyticsEvent): Promise<void> {
    // no-op by default
  }
}

function normalizeDate(value: string | Date | undefined): Date | null {
  if (value === undefined) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isWithinRange(
  createdAt: string | Date,
  start: Date | null,
  end: Date | null,
): boolean {
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  if (start && date < start) {
    return false;
  }
  if (end && date > end) {
    return false;
  }
  return true;
}

function buildStatsCacheKey(
  cooperativeId: string,
  start: Date | null,
  end: Date | null,
): string {
  const startKey = start ? start.toISOString() : "*";
  const endKey = end ? end.toISOString() : "*";
  return `cooperative:stats:${cooperativeId}:${startKey}:${endKey}`;
}

/**
 * Buckets trades by UTC creation day. Pure so overall (cross-cooperative)
 * metrics can be produced by passing the combined trade list.
 */
export function buildDailyMetrics(
  trades: CooperativeTradeRecord[],
  range: CooperativeStatsDateRange = {},
): DailyMetricsRow[] {
  const start = normalizeDate(range.start);
  const end = normalizeDate(range.end);
  const buckets = new Map<
    string,
    { trades: number; gmv: number; disputed: number; settled: number; settleMs: number }
  >();

  for (const trade of trades) {
    if (!isWithinRange(trade.createdAt, start, end)) {
      continue;
    }
    const createdAt = new Date(trade.createdAt);
    const date = createdAt.toISOString().slice(0, 10);
    const bucket = buckets.get(date) ?? {
      trades: 0,
      gmv: 0,
      disputed: 0,
      settled: 0,
      settleMs: 0,
    };

    bucket.trades += 1;
    bucket.gmv += trade.amount ?? 0;
    if (trade.disputed === true || trade.status === "disputed") {
      bucket.disputed += 1;
    }
    if (trade.completedAt) {
      const settleMs = new Date(trade.completedAt).getTime() - createdAt.getTime();
      if (Number.isFinite(settleMs) && settleMs >= 0) {
        bucket.settled += 1;
        bucket.settleMs += settleMs;
      }
    }

    buckets.set(date, bucket);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bucket]) => ({
      date,
      trades: bucket.trades,
      gmv: bucket.gmv,
      disputedTrades: bucket.disputed,
      disputeRate: bucket.trades === 0 ? 0 : bucket.disputed / bucket.trades,
      settledTrades: bucket.settled,
      avgTimeToSettleHours:
        bucket.settled === 0 ? null : bucket.settleMs / bucket.settled / 3_600_000,
    }));
}

/**
 * Serialises daily metrics rows to CSV (header + one line per day).
 */
export function toDailyMetricsCsv(rows: DailyMetricsRow[]): string {
  const header = [
    "date",
    "trades",
    "gmv",
    "disputed_trades",
    "dispute_rate",
    "settled_trades",
    "avg_time_to_settle_hours",
  ];
  const lines = rows.map((row) =>
    [
      row.date,
      row.trades,
      row.gmv,
      row.disputedTrades,
      row.disputeRate,
      row.settledTrades,
      row.avgTimeToSettleHours ?? "",
    ].join(","),
  );
  return [header.join(","), ...lines].join("\n") + "\n";
}

export const analyticsService = new AnalyticsService();
