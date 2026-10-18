import { Response, Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.middleware";
import { adminMiddleware } from "../middleware/admin.middleware";
import { validateRequest } from "../middleware/validateRequest";
import { AuthRequest } from "../services/auth.service";
import { appLogger } from "../middleware/logger";
import {
  PayoutIntentService,
  payoutIntentService as defaultPayoutIntentService,
} from "../services/payoutIntent.service";
import { StellarService } from "../services/stellar.service";

export const reconcileBodySchema = z.object({
  /** Skip intents touched more recently than this, so in-flight work is left alone. */
  olderThanMs: z.number().int().min(0).max(86_400_000).default(60_000),
  limit: z.number().int().min(1).max(500).default(100),
});

/**
 * Resolves a transaction hash against the chain.
 *
 * `NOT_FOUND` is deliberately distinct from `FAILED`: an RPC that has not yet
 * seen the transaction tells us nothing, and treating that as failure would
 * release the idempotency key while a payout may still be in flight.
 */
export async function chainOutcome(
  stellar: Pick<StellarService, "getTransactionStatus">,
  txHash: string,
): Promise<"SUCCESS" | "FAILED" | "NOT_FOUND"> {
  try {
    const status = await stellar.getTransactionStatus(txHash);
    if (status === "SUCCESS") return "SUCCESS";
    if (status === "FAILED") return "FAILED";
    return "NOT_FOUND";
  } catch (err) {
    appLogger.warn({ err, txHash }, "Payout reconciliation could not reach the RPC");
    return "NOT_FOUND";
  }
}

/**
 * Admin routes for the payout idempotency ledger (issue #179).
 *
 * Reconciliation exists because a crash between submission and the DB commit
 * leaves an intent unresolved. Until the chain is consulted the key stays
 * claimed, so no retry can double-pay; this sweep is what eventually releases
 * or confirms it.
 */
export function createAdminPayoutsRouter(
  payoutIntents: Pick<PayoutIntentService, "reconcile" | "findUnresolved" | "findByKey"> =
    defaultPayoutIntentService,
  stellar: Pick<StellarService, "getTransactionStatus"> = new StellarService(),
): Router {
  const router = Router();

  router.use(authMiddleware, adminMiddleware);

  /**
   * POST /api/admin/payouts/reconcile
   * Resolve unresolved payout intents against the chain.
   */
  router.post(
    "/api/admin/payouts/reconcile",
    validateRequest({ body: reconcileBodySchema }),
    async (req: AuthRequest, res: Response) => {
      try {
        const { olderThanMs, limit } = reconcileBodySchema.parse(req.body);
        const result = await payoutIntents.reconcile(
          (txHash) => chainOutcome(stellar, txHash),
          { olderThanMs, limit },
        );
        appLogger.info(
          { actorAddress: req.user?.walletAddress, ...result },
          "Admin triggered payout reconciliation",
        );
        res.json(result);
      } catch (err) {
        appLogger.error({ err }, "Payout reconciliation failed");
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  /**
   * GET /api/admin/payouts/pending
   * List intents that have not reached a terminal state.
   */
  router.get("/api/admin/payouts/pending", async (_req: AuthRequest, res: Response) => {
    try {
      const intents = await payoutIntents.findUnresolved(0, 100);
      res.json({ intents });
    } catch (err) {
      appLogger.error({ err }, "Failed to list pending payout intents");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}

export const adminPayoutsRoutes = createAdminPayoutsRouter();
