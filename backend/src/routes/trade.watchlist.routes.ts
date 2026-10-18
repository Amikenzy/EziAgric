import { PrismaClient } from "@prisma/client";
import { NextFunction, Response, Router } from "express";
import { callerAddress } from "../lib/callerAddress";
import { prisma as defaultPrisma } from "../lib/db";
import { authMiddleware } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validateRequest";
import { tradeIdParamSchema } from "../schemas/trade.schemas";
import { AuthRequest } from "../services/auth.service";
import {
  TradeWatchlistService,
  WatchTradeAccessDeniedError,
  WatchTradeNotFoundError,
} from "../services/trade.watchlist.service";

function handleWatchError(error: unknown, res: Response, next: NextFunction) {
  if (error instanceof WatchTradeNotFoundError) {
    res.status(404).json({ error: error.message });
    return;
  }
  if (error instanceof WatchTradeAccessDeniedError) {
    res.status(403).json({ error: error.message });
    return;
  }
  next(error);
}

export function createTradeWatchlistRouter(prisma: PrismaClient = defaultPrisma) {
  const router = Router();
  const watchlist = new TradeWatchlistService(prisma);

  router.post("/:id/watch", authMiddleware, validateRequest({ params: tradeIdParamSchema }), async (req: AuthRequest, res, next) => {
    const userAddress = callerAddress(req, res);
    if (!userAddress) return;
    try {
      const watch = await watchlist.add(String(req.params.id), userAddress);
      res.status(201).json({ watch });
    } catch (error) {
      handleWatchError(error, res, next);
    }
  });

  router.delete("/:id/watch", authMiddleware, validateRequest({ params: tradeIdParamSchema }), async (req: AuthRequest, res, next) => {
    const userAddress = callerAddress(req, res);
    if (!userAddress) return;
    try {
      const result = await watchlist.remove(String(req.params.id), userAddress);
      res.status(200).json(result);
    } catch (error) {
      handleWatchError(error, res, next);
    }
  });

  router.get("/watched", authMiddleware, async (req: AuthRequest, res, next) => {
    const userAddress = callerAddress(req, res);
    if (!userAddress) return;
    try {
      res.status(200).json({ items: await watchlist.list(userAddress) });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
