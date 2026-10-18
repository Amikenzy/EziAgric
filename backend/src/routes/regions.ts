import { Router, Request, Response } from 'express';
import { prisma } from '../lib/db';

const router = Router();

/**
 * GET /regions
 * Returns Nigerian states (36 + FCT) with their LGAs.
 * Optional query param `state` filters by state name or code (case-insensitive).
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const stateFilter = typeof req.query.state === 'string' ? req.query.state.trim() : undefined;

    const where = stateFilter
      ? {
          OR: [
            { name: { equals: stateFilter, mode: 'insensitive' as const } },
            { code: { equals: stateFilter, mode: 'insensitive' as const } },
          ],
        }
      : undefined;

    const regions = await prisma.region.findMany({
      where,
      include: { lgas: true },
      orderBy: { name: 'asc' },
    });

    res.json({ data: regions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch regions' });
  }
});

export default router;
