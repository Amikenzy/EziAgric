import { Response, Router } from "express";
import { z } from "zod";
import * as StellarSdk from "@stellar/stellar-sdk";
import { callerAddress } from "../lib/callerAddress";
import { authMiddleware } from "../middleware/auth.middleware";
import { adminMiddleware } from "../middleware/admin.middleware";
import { validateRequest } from "../middleware/validateRequest";
import { AuthRequest } from "../services/auth.service";
import { eraseUserData, exportUserData } from "../services/privacy.service";

const stellarAddress = z
  .string()
  .refine((value) => StellarSdk.StrKey.isValidEd25519PublicKey(value), {
    message: "Must be a valid Stellar public key",
  });

const walletAddressParamSchema = z.object({
  walletAddress: stellarAddress,
});
export function createPrivacyRouter() {
  const router = Router();

  router.get("/users/me/export", authMiddleware, async (req: AuthRequest, res: Response, next) => {
    try {
      const address = callerAddress(req, res);
      if (!address) return;
      res.json(await exportUserData(address));
    } catch (error) {
      next(error);
    }
  });

  router.delete("/users/me", authMiddleware, async (req: AuthRequest, res: Response, next) => {
    try {
      const address = callerAddress(req, res);
      if (!address) return;
      res.json(await eraseUserData(address));
    } catch (error) {
      next(error);
    }
  });

  router.get(
    "/admin/privacy/users/:walletAddress/export",
    authMiddleware,
    adminMiddleware,
    validateRequest({ params: walletAddressParamSchema }),
    async (req, res, next) => {
      try {
        res.json(await exportUserData(req.params.walletAddress as string));
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    "/admin/privacy/users/:walletAddress",
    authMiddleware,
    adminMiddleware,
    validateRequest({ params: walletAddressParamSchema }),
    async (req, res, next) => {
      try {
        res.json(await eraseUserData(req.params.walletAddress as string));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}