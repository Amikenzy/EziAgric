import { Response, Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';
import { validateRequest } from '../middleware/validateRequest';
import { AuthRequest } from '../services/auth.service';
import { tradeExpiryService } from '../services/tradeExpiry.service';
import { tradeExpiryQueue } from '../jobs/queue';
import { appLogger } from '../middleware/logger';

const sweepBodySchema = z.object({
  batchSize: z.number().int().min(1).max(500).default(100),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export function createAdminExpiryRouter(): Router {
  const router = Router();

  router.use(authMiddleware, adminMiddleware);

  /**
   * POST /api/admin/trades/sweep-expired
   * Trigger an immediate expiry sweep (admin override for stuck expiries).
   */
  router.post(
    '/api/admin/trades/sweep-expired',
    validateRequest({ body: sweepBodySchema }),
    async (req: AuthRequest, res: Response) => {
      try {
        const { batchSize } = sweepBodySchema.parse(req.body);
        const result = await tradeExpiryService.sweepExpiredTrades(batchSize);
        appLogger.info({ actorAddress: req.user?.walletAddress, ...result }, 'Admin triggered expiry sweep');
        res.json(result);
      } catch (err) {
        appLogger.error({ err }, 'Admin expiry sweep failed');
        res.status(500).json({ error: 'Internal server error' });
      }
    },
  );

  /**
   * POST /api/admin/trades/sweep-expired/enqueue
   * Enqueue an expiry sweep job to run asynchronously.
   */
  router.post(
    '/api/admin/trades/sweep-expired/enqueue',
    validateRequest({ body: sweepBodySchema }),
    async (req: AuthRequest, res: Response) => {
      try {
        const { batchSize } = sweepBodySchema.parse(req.body);
        const job = await tradeExpiryQueue.add('admin-sweep', { batchSize });
        res.json({ jobId: job.id, batchSize });
      } catch (err) {
        appLogger.error({ err }, 'Failed to enqueue expiry sweep');
        res.status(500).json({ error: 'Internal server error' });
      }
    },
  );

  /**
   * GET /api/admin/trades/pending-refunds
   * Lists EXPIRED trades awaiting on-chain refund submission.
   */
  router.get(
    '/api/admin/trades/pending-refunds',
    validateRequest({ query: listQuerySchema }),
    async (req: AuthRequest, res: Response) => {
      try {
        const { page, limit } = listQuerySchema.parse(req.query);
        const { items, total } = await tradeExpiryService.getPendingRefunds(page, limit);
        res.json({ count: total, trades: items, page, limit });
      } catch (err) {
        appLogger.error({ err }, 'Failed to fetch pending refunds');
        res.status(500).json({ error: 'Internal server error' });
      }
    },
  );

  return router;
}
