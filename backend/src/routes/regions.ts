import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { validateRequest } from '../middleware/validateRequest';
import { paginateWithCursor, InvalidCursorError } from '../lib/cursorPagination';

const router = Router();
const prisma = new PrismaClient();

const regionsQuerySchema = z.object({
  state: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

/**
 * GET /regions
 * Returns Nigerian states (36 + FCT) with their LGAs, cursor-paginated.
 * Optional query param `state` filters by state name or code (case-insensitive).
 * Optional query params `cursor` and `limit` (default 20, max 100) page through results;
 * pass `pageInfo.nextCursor` back as `cursor` to fetch the next page.
 */
router.get('/', validateRequest({ query: regionsQuerySchema }), async (req: Request, res: Response) => {
  try {
    const { state, cursor, limit } = req.query as unknown as {
      state?: string;
      cursor?: string;
      limit: number;
    };
    const stateFilter = state?.trim();

    const where = stateFilter
      ? {
          OR: [
            { name: { equals: stateFilter, mode: 'insensitive' as const } },
            { code: { equals: stateFilter, mode: 'insensitive' as const } },
          ],
        }
      : undefined;

    const result = await paginateWithCursor({
      findMany: (args) =>
        prisma.region.findMany({
          where,
          include: { lgas: true },
          ...args,
        } as any),
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      cursor,
      limit,
    });

    res.json({ data: result.items, pageInfo: result.pageInfo });
  } catch (error) {
    if (error instanceof InvalidCursorError) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to fetch regions' });
  }
});

export default router;
