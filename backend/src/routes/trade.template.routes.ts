import { PrismaClient } from "@prisma/client";
import { NextFunction, Response, Router } from "express";
import { prisma as defaultPrisma } from "../lib/db";
import { authMiddleware } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validateRequest";
import { AuthRequest } from "../services/auth.service";
import {
  TradeTemplateNotFoundError,
  TradeTemplateService,
} from "../services/trade.template.service";
import {
  createTradeTemplateSchema,
  listTradeTemplatesQuerySchema,
  templateIdParamSchema,
} from "../schemas/trade.template.schemas";

function caller(req: AuthRequest, res: Response): string | null {
  const walletAddress = req.user?.walletAddress?.trim();
  if (!walletAddress) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return walletAddress;
}

export function createTradeTemplateRouter(prisma: PrismaClient = defaultPrisma) {
  const router = Router();
  const templates = new TradeTemplateService(prisma);

  router.post(
    "/templates",
    authMiddleware,
    validateRequest({ body: createTradeTemplateSchema }),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      const userAddress = caller(req, res);
      if (!userAddress) return;
      try {
        const template = await templates.save(userAddress, req.body);
        res.status(201).json({ template });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/templates",
    authMiddleware,
    validateRequest({ query: listTradeTemplatesQuerySchema }),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      const userAddress = caller(req, res);
      if (!userAddress) return;
      try {
        const { page, limit } = req.query as unknown as { page: number; limit: number };
        res.status(200).json({ templates: await templates.list(userAddress, { page, limit }) });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/from-template/:templateId",
    authMiddleware,
    validateRequest({ params: templateIdParamSchema }),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      const userAddress = caller(req, res);
      if (!userAddress) return;
      try {
        const result = await templates.createTradeFromTemplate(
          Number(req.params.templateId),
          userAddress,
        );
        res.status(201).json(result);
      } catch (error) {
        if (error instanceof TradeTemplateNotFoundError) {
          res.status(404).json({ error: error.message });
          return;
        }
        next(error);
      }
    },
  );

  return router;
}
