import { Response, Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';
import { validateRequest } from '../middleware/validateRequest';
import { AuthRequest } from '../services/auth.service';
import { orphanDepositService, DepositEvent } from '../services/orphanDeposit.service';
import { appLogger } from '../middleware/logger';

const ingestBodySchema = z.object({
  events: z
    .array(
      z.object({
        ledgerSeq: z.number().int().positive(),
        txHash: z.string().min(1),
        depositorAddress: z.string().min(1),
        amountRaw: z.string().min(1),
        assetId: z.string().min(1),
        contractTradeId: z.string().optional(),
      }),
    )
    .min(1)
    .max(500),
});

const attachBodySchema = z.object({
  tradeId: z.string().min(1),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export function createAdminOrphanRouter(): Router {
  const router = Router();

  router.use(authMiddleware, adminMiddleware);

  /** GET /api/admin/orphan-deposits — list unresolved orphan deposits */
  router.get(
    '/api/admin/orphan-deposits',
    validateRequest({ query: listQuerySchema }),
    async (req: AuthRequest, res: Response) => {
      try {
        const { page, limit } = listQuerySchema.parse(req.query);
        const result = await orphanDepositService.listOrphans(page, limit);
        res.json(result);
      } catch (err) {
        appLogger.error({ err }, 'Failed to list orphan deposits');
        res.status(500).json({ error: 'Internal server error' });
      }
    },
  );

  /** POST /api/admin/orphan-deposits/ingest — ingest chain events from scanner */
  router.post(
    '/api/admin/orphan-deposits/ingest',
    validateRequest({ body: ingestBodySchema }),
    async (req: AuthRequest, res: Response) => {
      try {
        const { events } = ingestBodySchema.parse(req.body);
        const result = await orphanDepositService.ingestDepositEvents(events as DepositEvent[]);
        res.json(result);
      } catch (err) {
        appLogger.error({ err }, 'Failed to ingest deposit events');
        res.status(500).json({ error: 'Internal server error' });
      }
    },
  );

  /** POST /api/admin/orphan-deposits/:id/attach — link orphan to a trade */
  router.post(
    '/api/admin/orphan-deposits/:id/attach',
    validateRequest({ body: attachBodySchema }),
    async (req: AuthRequest, res: Response) => {
      try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const orphanId = /^\d+$/.test(id) ? Number(id) : NaN;
        if (isNaN(orphanId) || orphanId <= 0) {
          return res.status(400).json({ error: 'Invalid orphan deposit id' });
        }
        const { tradeId } = attachBodySchema.parse(req.body);
        const adminAddress = req.user?.walletAddress ?? '';
        await orphanDepositService.attachOrphanToTrade(orphanId, tradeId, adminAddress);
        res.json({ success: true, orphanId, tradeId });
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('not found')) {
          return res.status(404).json({ error: err.message });
        }
        appLogger.error({ err }, 'Failed to attach orphan deposit');
        res.status(500).json({ error: 'Internal server error' });
      }
    },
  );

  return router;
}
