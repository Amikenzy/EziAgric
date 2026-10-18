import { Response } from "express";
import { AuthRequest } from "../services/auth.service";

/**
 * Returns the authenticated caller's wallet address, or responds 401 and returns null.
 */
export function callerAddress(req: AuthRequest, res: Response): string | null {
  const walletAddress = req.user?.walletAddress?.trim();
  if (!walletAddress) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return walletAddress;
}
