import { NextFunction, Router, Response } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.middleware";
import { AuthRequest } from "../services/auth.service";
import {
    ManifestService,
    ManifestForbiddenError,
    ManifestConflictError,
    ManifestTradeStatusError,
    ManifestTradeNotFoundError,
    ManifestAccessDeniedError,
    ManifestNotFoundError,
    ManifestTokenError,
} from "../services/manifest.service";
import { ContractService } from "../services/contract.service";
import { appLogger } from "../middleware/logger";
import { RATE_LIMIT_CONFIG } from "../config/rateLimit";
import { createIpRateLimiter } from "../lib/rateLimit";

// Driver links are wallet-less, so per-IP limits are the only brake on token guessing.
const driverTokenLimiter = createIpRateLimiter(RATE_LIMIT_CONFIG.driverToken);

const manifestBodySchema = z.object({
    driverName: z.string().min(1),
    driverIdNumber: z.string().min(1),
    vehicleRegistration: z.string().min(1),
    routeDescription: z.string().min(1),
    expectedDeliveryAt: z.string().datetime(),
});

const attestBodySchema = z.object({
    outcome: z.enum(["delivered", "lost"]),
    videoCid: z.string().min(1).optional(),
});

function deviceMetadata(req: AuthRequest) {
    return {
        ip: req.ip,
        userAgent: req.get("user-agent") ?? undefined,
    };
}

export function createManifestRouter(
    manifestService = new ManifestService(),
    contractService = new ContractService(),
) {
    const router = Router({ mergeParams: true });

    // GET /trades/:id/manifest
    router.get("/", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
        const callerAddress = req.user?.walletAddress;
        if (!callerAddress) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        try {
            const manifest = await manifestService.getManifestByTradeId(
                req.params.id as string,
                callerAddress,
            );
            res.status(200).json(manifest);
        } catch (err) {
            if (
                err instanceof ManifestTradeNotFoundError ||
                err instanceof ManifestNotFoundError
            ) {
                res.status(404).json({ error: err.message });
                return;
            }
            if (err instanceof ManifestAccessDeniedError) {
                res.status(403).json({ error: err.message });
                return;
            }
            return next(err);
        }
    });

    // POST /trades/:id/manifest
    router.post("/", authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
        const callerAddress = req.user?.walletAddress;
        if (!callerAddress) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const parsed = manifestBodySchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.flatten().fieldErrors });
            return;
        }

        const tradeId = req.params.id as string;

        try {
            const { manifestId, driverNameHash, driverIdHash } =
                await manifestService.submitManifest({
                    tradeId,
                    callerAddress,
                    ...parsed.data,
                });

            const { unsignedXdr } = await contractService.buildSubmitManifestTx({
                tradeId,
                sellerAddress: callerAddress,
                driverNameHash,
                driverIdHash,
            });

            res.status(201).json({ manifestId, unsignedXdr });
        } catch (err) {
            if (
                err instanceof ManifestForbiddenError ||
                err instanceof ManifestConflictError ||
                err instanceof ManifestTradeStatusError ||
                err instanceof ManifestTradeNotFoundError
            ) {
                res.status((err as any).status).json({ error: err.message });
                return;
            }
            return next(err);
        }
    });

    // POST /trades/:id/manifest/driver-link
    router.post(
        "/driver-link",
        authMiddleware,
        async (req: AuthRequest, res: Response, next: NextFunction) => {
            const callerAddress = req.user?.walletAddress;
            if (!callerAddress) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            try {
                const link = await manifestService.issueDriverLink(
                    req.params.id as string,
                    callerAddress,
                );
                res.status(201).json(link);
            } catch (err) {
                if (
                    err instanceof ManifestTradeNotFoundError ||
                    err instanceof ManifestNotFoundError
                ) {
                    res.status(404).json({ error: err.message });
                    return;
                }
                if (err instanceof ManifestAccessDeniedError) {
                    res.status(403).json({ error: err.message });
                    return;
                }
                return next(err);
            }
        },
    );

    // POST /trades/:id/manifest/driver/:token/pickup
    router.post(
        "/driver/:token/pickup",
        driverTokenLimiter,
        async (req: AuthRequest, res: Response, next: NextFunction) => {
            try {
                const result = await manifestService.confirmDriverPickup(
                    req.params.token as string,
                    deviceMetadata(req),
                );
                res.status(200).json(result);
            } catch (err) {
                if (err instanceof ManifestTokenError) {
                    res.status((err as any).status ?? 400).json({ error: err.message });
                    return;
                }
                return next(err);
            }
        },
    );

    // POST /trades/:id/manifest/driver/:token/attest
    router.post(
        "/driver/:token/attest",
        driverTokenLimiter,
        async (req: AuthRequest, res: Response, next: NextFunction) => {
            const parsed = attestBodySchema.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({ error: parsed.error.flatten().fieldErrors });
                return;
            }

            try {
                const result = await manifestService.attestDriverOutcome(
                    req.params.token as string,
                    parsed.data.outcome,
                    parsed.data.videoCid,
                    deviceMetadata(req),
                );
                res.status(200).json(result);
            } catch (err) {
                if (err instanceof ManifestTokenError) {
                    res.status((err as any).status ?? 400).json({ error: err.message });
                    return;
                }
                return next(err);
            }
        },
    );

    return router;
}
