import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware as authenticate } from '../middleware/auth.middleware';
import { requireCooperativeManager } from '../lib/accessControl';
import { analyticsService } from '../services/analytics.service';

const router = Router();

const statsQuerySchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
});

/**
 * GET /cooperatives/:id/stats
 * Aggregate volume, active trades, dispute rate and member trust scores
 * for a cooperative within an optional date range. Restricted to
 * cooperative managers. Results are cached in Redis for 5 minutes.
 */
router.get(
  '/:id/stats',
  authenticate,
  requireCooperativeManager,
  async (req: Request, res: Response) => {
    const parsed = statsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid date range',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { start, end } = parsed.data;
    if (start && end && new Date(start) > new Date(end)) {
      return res.status(400).json({ error: 'start must be before end' });
    }

    try {
      const stats = await analyticsService.getCooperativeStats(req.params.id, {
        start,
        end,
      });
      return res.json(stats);
    } catch (err) {
      if (err instanceof Error && err.message === 'COOPERATIVE_NOT_FOUND') {
        return res.status(404).json({ error: 'Cooperative not found' });
      }
      return res.status(500).json({ error: 'Failed to compute cooperative stats' });
    }
  }
);

export default router;
