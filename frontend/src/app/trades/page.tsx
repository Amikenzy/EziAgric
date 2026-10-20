"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAnalytics } from "@/components/AnalyticsProvider";
import { useToast } from "@/hooks/useToast";
import { api, ApiError, TradeResponse } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { NavButton } from "@/components/ui/Navigation";
import { VirtualizedList } from "@/components/ui/VirtualizedList";

type TradeStatus = "all" | "active" | "pending" | "completed" | "disputed";
type TradeRole = "all" | "buying" | "selling";

const STATUS_FILTERS: { label: string; value: TradeStatus }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Pending", value: "pending" },
  { label: "Completed", value: "completed" },
  { label: "Disputed", value: "disputed" },
];

const ROLE_FILTERS: { label: string; value: TradeRole }[] = [
  { label: "All roles", value: "all" },
  { label: "Buying", value: "buying" },
  { label: "Selling", value: "selling" },
];

/** Statuses where the wallet-address holder needs to act. */
function needsMyAction(trade: TradeResponse, address: string | null): boolean {
  if (!address) return false;
  const addr = address.toLowerCase();
  const isBuyer = trade.buyerAddress.toLowerCase() === addr;
  const isSeller = trade.sellerAddress.toLowerCase() === addr;
  const s = trade.status.toUpperCase();
  return (
    (isBuyer && s === "PENDING") ||
    (isBuyer && s === "FUNDED") ||
    (isSeller && (s === "FUNDED" || s === "CONFIRMED"))
  );
}

// Status chip tokens: text = status color, bg = status/10, border = status/20.
// "completed" and "draft" use neutral surface tokens (no alert color).
const STATUS_STYLES: Record<string, string> = {
  active:    "text-status-success bg-status-success/10 border border-status-success/20",
  pending:   "text-status-warning bg-status-warning/10 border border-status-warning/20",
  completed: "text-text-secondary bg-surface-2 border border-border-default",
  disputed:  "text-status-danger  bg-status-danger/10  border border-status-danger/20",
  locked:    "text-status-locked  bg-status-locked/10  border border-status-locked/20",
  draft:     "text-status-draft   bg-surface-1         border border-border-default",
};

const PAGE_SIZE = 100;
const ROW_HEIGHT = 52;

function TradesTableSkeleton() {
  return (
    <div className="rounded-lg border border-border-default overflow-hidden shadow-elev-1">
      {/* Header: surface-1 (card level) */}
      <div className="border-b border-border-default bg-surface-1 px-4 py-3">
        <div className="grid grid-cols-5 gap-4">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      {/* Rows: surface-0 (canvas) */}
      <div className="divide-y divide-border-default bg-surface-0">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="grid grid-cols-5 gap-4 px-4 py-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TradesPage() {
  const { token, isAuthenticated, address } = useAuth();
  const { trackApiFailure, trackFunnelStep } = useAnalytics();
  const { addToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Derive filter state from URL; fall back to "all"
  const activeFilter = (searchParams.get("status") as TradeStatus) ?? "all";
  const activeRole = (searchParams.get("role") as TradeRole) ?? "all";
  const needsAction = searchParams.get("action") === "1";
  const page = Number(searchParams.get("page") ?? "1");

  const [allTrades, setAllTrades] = useState<TradeResponse[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Push updated URL params without adding a new history entry for page resets. */
  const pushParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "all" || v === "1" || (k === "action" && v === "0")) {
          params.delete(k);
        } else {
          params.set(k, v);
        }
      }
      router.push(`/trades?${params.toString()}`);
    },
    [router, searchParams],
  );

  useEffect(() => {
    trackFunnelStep("trade_page_view", { filter: activeFilter, role: activeRole });

    async function fetchTrades() {
      if (!isAuthenticated || !token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const statusParam = activeFilter === "all" ? undefined : activeFilter;
        const response = await api.trades.list(token, {
          status: statusParam,
          page,
          limit: PAGE_SIZE,
        });

        setAllTrades(response.items);
        setTotalPages(response.pagination.totalPages);
      } catch (err) {
        let errorMessage = "Failed to load trades";
        let status = 0;

        if (err instanceof ApiError) {
          errorMessage = err.message;
          status = err.status ?? 0;
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }

        trackApiFailure("/trades", status, { message: errorMessage, filter: activeFilter });
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    fetchTrades();
  }, [token, isAuthenticated, activeFilter, page, trackApiFailure, trackFunnelStep]);

  /** Client-side role + action filter applied after the API fetch. */
  const trades = useMemo(() => {
    return allTrades.filter((t) => {
      if (activeRole !== "all") {
        const addr = address?.toLowerCase();
        const isBuyer = t.buyerAddress.toLowerCase() === addr;
        const isSeller = t.sellerAddress.toLowerCase() === addr;
        if (activeRole === "buying" && !isBuyer) return false;
        if (activeRole === "selling" && !isSeller) return false;
      }
      if (needsAction && !needsMyAction(t, address ?? null)) return false;
      return true;
    });
  }, [allTrades, activeRole, needsAction, address]);

  function handleStatusFilter(value: TradeStatus) {
    pushParams({ status: value === "all" ? null : value, page: null });
  }

  function handleRoleFilter(value: TradeRole) {
    pushParams({ role: value === "all" ? null : value, page: null });
  }

  function handleNeedsAction() {
    pushParams({ action: needsAction ? "0" : "1", page: null });
  }

  // Keep legacy name for pagination calls
  const setPage = (p: number | ((prev: number) => number)) => {
    const next = typeof p === "function" ? p(page) : p;
    pushParams({ page: String(next) });
  };


  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatAddress(address: string) {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      {/*
       * #445 — Shell is canonical: AppTopNav (layout.tsx) now includes Trades
       * and highlights the active route, so this page no longer renders a
       * duplicate "Trades" heading. The Create Trade action and filter tabs
       * remain as page-specific controls within the single shell.
       */}
      <div className="flex items-center justify-end gap-2 mb-6">
        <div className="hidden md:flex items-center gap-2 mr-2 border-r border-border-default pr-4">
          <button
            type="button"
            onClick={() => addToast({ type: "success", title: "Success", message: "Trade completed successfully!" })}
            className="px-3 py-1.5 rounded-md bg-status-success/10 border border-status-success/30 text-status-success text-xs font-medium hover:bg-status-success/20 transition-colors"
          >
            Success
          </button>
          <button
            type="button"
            onClick={() => addToast({ type: "error", title: "Error", message: "Failed to complete trade." })}
            className="px-3 py-1.5 rounded-md bg-status-danger/10 border border-status-danger/30 text-status-danger text-xs font-medium hover:bg-status-danger/20 transition-colors"
          >
            Error
          </button>
          <button
            type="button"
            onClick={() => addToast({ type: "warning", title: "Warning", message: "Trade is disputed." })}
            className="px-3 py-1.5 rounded-md bg-status-warning/10 border border-status-warning/30 text-status-warning text-xs font-medium hover:bg-status-warning/20 transition-colors"
          >
            Warning
          </button>
          <button
            type="button"
            onClick={() => addToast({ type: "info", title: "Info", message: "New message received." })}
            className="px-3 py-1.5 rounded-md bg-status-info/10 border border-status-info/30 text-status-info text-xs font-medium hover:bg-status-info/20 transition-colors"
          >
            Info
          </button>
        </div>
        <Link href="/trades/create">
          <Button variant="primary">Create Trade</Button>
        </Link>
      </div>

      {/* Filter bar */}
      <div className="mb-6 flex flex-col gap-3">
        {/* Status chips */}
        <div className="flex items-center gap-2 flex-wrap" role="tablist" aria-label="Filter by status">
          {STATUS_FILTERS.map((filter) => {
            const isActive = activeFilter === filter.value;
            return (
              <NavButton
                key={filter.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleStatusFilter(filter.value)}
                isActive={isActive}
              >
                {filter.label}
              </NavButton>
            );
          })}
        </div>

        {/* Role + action chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {ROLE_FILTERS.map((rf) => {
            const isActive = activeRole === rf.value;
            return (
              <NavButton
                key={rf.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => handleRoleFilter(rf.value)}
                isActive={isActive}
              >
                {rf.label}
              </NavButton>
            );
          })}
          <NavButton
            type="button"
            aria-pressed={needsAction}
            onClick={handleNeedsAction}
            isActive={needsAction}
          >
            ⚡ Needs my action
          </NavButton>
        </div>
      </div>

      {/* Loading state */}
      {loading && <TradesTableSkeleton />}

      {/* Error state */}
      {error && !loading && (
        <div className="rounded-lg border border-status-danger/40 bg-status-danger/15 px-4 py-3 text-center">
          <p className="text-status-danger text-sm">{error}</p>
        </div>
      )}

      {/* Trade list */}
      {!loading && !error && (
        <>
          {trades.length === 0 ? (
            <div className="rounded-lg border border-border-default bg-surface-1 py-20 px-6 text-center shadow-elev-1">
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-lg bg-surface-2 border border-border-default flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-text-muted"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>

              {/* Heading */}
              <h3 className="text-xl font-semibold text-text-primary mb-3">
                No trades yet
              </h3>

              {/* Description */}
              <p className="text-text-secondary text-sm mb-8 max-w-sm mx-auto leading-relaxed">
                Get started by creating your first trade to begin settling
                agricultural transactions securely on the blockchain.
              </p>

              {/* CTA Button */}
              <Link href="/trades/create">
                <Button variant="primary" size="lg">Create Your First Trade</Button>
              </Link>
            </div>
          ) : (
            <div className="rounded-lg border border-border-default overflow-hidden shadow-elev-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-default bg-surface-1">
                    <th className="text-left px-4 py-3 text-text-muted font-medium">
                      ID
                    </th>
                    <th className="text-left px-4 py-3 text-text-muted font-medium">
                      Counterparty
                    </th>
                    <th className="text-left px-4 py-3 text-text-muted font-medium">
                      Amount
                    </th>
                    <th className="text-left px-4 py-3 text-text-muted font-medium">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-text-muted font-medium">
                      Created
                    </th>
                  </tr>
                </thead>
              </table>
              <VirtualizedList
                items={trades}
                rowHeight={ROW_HEIGHT}
                maxHeight={Math.min(trades.length * ROW_HEIGHT, 600)}
                keyExtractor={(trade) => trade.tradeId}
                renderItem={(trade, i) => (
                  <div
                    className={`grid grid-cols-5 gap-4 px-4 py-3 border-b border-border-default last:border-0 hover:bg-surface-2 transition-colors ${
                      i % 2 === 0 ? "bg-surface-0" : "bg-surface-1"
                    }`}
                  >
                    <div className="text-gold font-mono">
                      <Link
                        href={`/trades/${trade.tradeId}`}
                        className="hover:underline underline-offset-4"
                      >
                        {trade.tradeId.slice(0, 8)}...
                      </Link>
                    </div>
                    <div className="text-text-secondary font-mono">
                      {formatAddress(trade.sellerAddress)}
                    </div>
                    <div className="text-text-primary">
                      {trade.amountCngn} cNGN
                    </div>
                    <div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          STATUS_STYLES[trade.status] ?? "text-text-muted"
                        }`}
                      >
                        {trade.status}
                      </span>
                    </div>
                    <div className="text-text-secondary">
                      {formatDate(trade.createdAt)}
                    </div>
                  </div>
                )}
              />
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 text-sm text-text-secondary">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-md border border-border-default hover:border-border-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-md border border-border-default hover:border-border-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
