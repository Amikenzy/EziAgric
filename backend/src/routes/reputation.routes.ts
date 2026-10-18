import { Router } from "express";
import { prisma } from "../lib/db";
import { ReputationService } from "../services/reputation.service";
import { authMiddleware, AuthRequest } from "../middleware/auth.middleware";
import { adminMiddleware } from "../middleware/admin.middleware";
import { AppError, ErrorCode } from "../errors/errorCodes";

const router = Router();
const reputationService = new ReputationService(prisma);

router.get(
  "/me/reputation",
  authMiddleware,
  async (req: AuthRequest, res, next) => {
    try {
      const address = req.user?.walletAddress;
      if (!address) {
        return next(new AppError(ErrorCode.AUTH_ERROR, "Unauthorized", 401));
      }
      const reputation = await reputationService.getUserReputation(address);
      res.json(reputation);
    } catch (err) {
      next(err);
    }
  }
);

// Documented trust score inputs and weights. See docs/trust-score.md for the
// full spec. Exposed so clients can render the formula without hardcoding it.
router.get("/reputation/spec", (_req, res) => {
  res.json(reputationService.getTrustScoreSpec());
});

// Recompute the trust score for a single wallet on demand. Used by trade
// completion / dispute resolution flows to keep scores fresh within 1 minute.
// Caller: admin only (mediator allowlist). Internal flows call the service
// directly; this HTTP entry point is for admin tooling.
router.post(
  "/:address/reputation/recompute",
  authMiddleware,
  adminMiddleware,
  async (req, res, next) => {
    try {
      const raw = req.params.address;
      const address = Array.isArray(raw) ? raw[0] : raw;
      if (!address) {
        return next(new AppError(ErrorCode.VALIDATION_ERROR, "Wallet address is required", 400));
      }
      const reputation = await reputationService.recomputeTrustScore(address);
      res.json(reputation);
    } catch (err) {
      next(err);
    }
  }
);

// Nightly full recompute job with drift report. Intended to be triggered by a
// scheduler (cron) and returns the drift report for observability.
// Caller: admin only (mediator allowlist). Scheduled runs execute the service
// in-process; this HTTP entry point is for manual admin triggers.
router.post(
  "/reputation/recompute-all",
  authMiddleware,
  adminMiddleware,
  async (_req, res, next) => {
    try {
      const report = await reputationService.recomputeAllTrustScores();
      res.json(report);
    } catch (err) {
      next(err);
    }
  }
);

// Trust score lookup for an arbitrary wallet. Caller: any authenticated user.
router.get(
  "/:address/reputation",
  authMiddleware,
  async (req, res, next) => {
    try {
      const raw = req.params.address;
      const address = Array.isArray(raw) ? raw[0] : raw;
      if (!address) {
        return next(new AppError(ErrorCode.VALIDATION_ERROR, "Wallet address is required", 400));
      }
      const reputation = await reputationService.getUserReputation(address);
      res.json(reputation);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
