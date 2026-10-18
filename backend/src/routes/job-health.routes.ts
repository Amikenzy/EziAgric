/**
 * Job Health & Heartbeat Routes
 * 
 * Exposes job status and heartbeat information for monitoring dashboards
 * and manual intervention when needed
 */

import { Router, Request, Response, NextFunction } from "express";
import { JobType, jobHeartbeatService } from "../services/jobHeartbeat.service";
import { appLogger } from "../middleware/logger";
import { prisma } from "../lib/db";

const isJobType = (value: string): value is JobType =>
  (Object.values(JobType) as string[]).includes(value);

export function createJobHealthRoutes(): Router {
  const router = Router();

  // Middleware to require admin role (assumes auth middleware exists)
  const isAdmin = (req: Request, res: Response, next: NextFunction) => {
    // This would be implemented based on your auth system
    // For now, we'll assume there's a check in place
    next();
  };

  /**
   * GET /health/jobs
   * Get health status of all scheduled jobs
   */
  router.get("/jobs", isAdmin, async (req: Request, res: Response) => {
    try {
      const jobHealth = await jobHeartbeatService.getAllJobHealth();

      const healthy = jobHealth.filter((j) => j.status === "healthy");
      const stale = jobHealth.filter((j) => j.status === "stale");
      const overdue = jobHealth.filter((j) => j.status === "failed" || j.isOverdue);

      res.status(overdue.length > 0 ? 503 : 200).json({
        status: overdue.length > 0 ? "degraded" : "healthy",
        summary: {
          total: jobHealth.length,
          healthy: healthy.length,
          stale: stale.length,
          overdue: overdue.length,
        },
        jobs: {
          healthy: healthy.map((j) => ({
            jobType: j.jobType,
            lastHeartbeat: j.lastHeartbeat.toISOString(),
            nextExpectedAt: j.nextExpectedAt.toISOString(),
            timeSinceLastBeat: j.timeSinceLastBeat,
          })),
          stale: stale.map((j) => ({
            jobType: j.jobType,
            lastHeartbeat: j.lastHeartbeat.toISOString(),
            nextExpectedAt: j.nextExpectedAt.toISOString(),
            timeSinceLastBeat: j.timeSinceLastBeat,
            warning:
              "No recent heartbeat, but not yet overdue",
          })),
          overdue: overdue.map((j) => ({
            jobType: j.jobType,
            lastHeartbeat: j.lastHeartbeat.toISOString(),
            nextExpectedAt: j.nextExpectedAt.toISOString(),
            timeSinceLastBeat: j.timeSinceLastBeat,
            failureCount: j.failureCount,
            isOverdue: j.isOverdue,
            alert: "Job missed scheduled heartbeat",
          })),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      appLogger.error({ error }, "[JobHealthRoute] Failed to get job health");
      res.status(500).json({
        error: "Failed to retrieve job health",
        message: String(error),
      });
    }
  });

  /**
   * GET /health/jobs/:jobType
   * Get detailed health status for a specific job
   */
  router.get("/jobs/:jobType", isAdmin, async (req: Request, res: Response) => {
    try {
        const jobTypeParam = Array.isArray(req.params.jobType)
          ? req.params.jobType[0]
          : req.params.jobType;
        const health = isJobType(jobTypeParam)
          ? await jobHeartbeatService.getJobHealth(jobTypeParam)
          : null;

        if (!health) {
          return res.status(404).json({
            error: "Job not found",
            jobType: jobTypeParam,
          });
        }

        res.status(health.status === "healthy" ? 200 : 503).json(health);
      } catch (error) {
        appLogger.error(
          { error, jobType: req.params.jobType },
          "[JobHealthRoute] Failed to get job health",
        );
        res.status(500).json({
          error: "Failed to retrieve job health",
          message: String(error),
        });
      }
    },
  );

  /**
   * GET /health/jobs/dashboard
   * Dashboard view with detailed analytics
   */
  router.get(
    "/dashboard",
    isAdmin,
    async (req: Request, res: Response) => {
      try {
        const allHeartbeats = await prisma.jobHeartbeat.findMany();

        const analytics = {
          totalJobs: allHeartbeats.length,
          health: {
            healthy: 0,
            stale: 0,
            failed: 0,
          },
          failureStats: {
            maxFailureCount: 0,
            averageFailureCount: 0,
            totalFailures: 0,
          },
          uptime: {
            lastDayUptime: 0,
            last7DaysUptime: 0,
          },
          jobDetails: allHeartbeats.map((hb) => ({
            jobType: hb.jobType,
            status: hb.status,
            lastHeartbeat: hb.lastHeartbeat.toISOString(),
            nextExpectedAt: hb.nextExpectedAt.toISOString(),
            failureCount: hb.failureCount,
            intervalMs: hb.intervalMs,
            lastError: hb.lastError,
          })),
        };

        // Calculate health breakdown
        const now = Date.now();
        const gracePeriod = 5 * 60 * 1000;

        allHeartbeats.forEach((hb) => {
          const timeSinceLastBeat = now - hb.lastHeartbeat.getTime();
          const isOverdue =
            hb.nextExpectedAt.getTime() < now &&
            now - hb.nextExpectedAt.getTime() > gracePeriod;

          if (hb.status === "failed" || hb.failureCount > 0) {
            analytics.health.failed++;
          } else if (
            isOverdue ||
            timeSinceLastBeat > hb.intervalMs + gracePeriod
          ) {
            analytics.health.stale++;
          } else {
            analytics.health.healthy++;
          }

          analytics.failureStats.maxFailureCount = Math.max(
            analytics.failureStats.maxFailureCount,
            hb.failureCount,
          );
          analytics.failureStats.totalFailures += hb.failureCount;
        });

        if (allHeartbeats.length > 0) {
          analytics.failureStats.averageFailureCount =
            analytics.failureStats.totalFailures / allHeartbeats.length;
        }

        res.status(200).json({
          analytics,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        appLogger.error({ error }, "[JobHealthRoute] Dashboard failed");
        res.status(500).json({
          error: "Dashboard generation failed",
          message: String(error),
        });
      }
    },
  );

  /**
   * POST /health/jobs/:jobType/manual-check
   * Manually trigger a health check for a specific job
   */
  router.post(
    "/jobs/:jobType/manual-check",
    isAdmin,
    async (req: Request, res: Response) => {
      try {
        const jobTypeParam = Array.isArray(req.params.jobType)
          ? req.params.jobType[0]
          : req.params.jobType;
        const health = isJobType(jobTypeParam)
          ? await jobHeartbeatService.getJobHealth(jobTypeParam)
          : null;

        if (!health) {
          return res.status(404).json({
            error: "Job not found",
            jobType: jobTypeParam,
          });
        }

        appLogger.info(
          { jobType: jobTypeParam },
          "[JobHealthRoute] Manual health check triggered",
        );

        res.status(200).json({
          message: "Health check completed",
          health,
        });
      } catch (error) {
        appLogger.error(
          { error, jobType: req.params.jobType },
          "[JobHealthRoute] Manual check failed",
        );
        res.status(500).json({
          error: "Manual check failed",
          message: String(error),
        });
      }
    },
  );

  /**
   * POST /health/jobs/:jobType/reset-failures
   * Reset failure count for a job (admin intervention)
   */
  router.post(
    "/jobs/:jobType/reset-failures",
    isAdmin,
    async (req: Request, res: Response) => {
      try {
        const jobTypeParam = Array.isArray(req.params.jobType)
          ? req.params.jobType[0]
          : req.params.jobType;
        const { reason } = req.body;

        await prisma.jobHeartbeat.update({
          where: { jobType: jobTypeParam },
          data: {
            failureCount: 0,
            status: "idle",
            notes: reason || "Failure count reset by admin",
          },
        });

        appLogger.warn(
          { jobType: jobTypeParam, reason },
          "[JobHealthRoute] Failure count reset by admin",
        );

        res.status(200).json({
          message: "Failure count reset",
          jobType: jobTypeParam,
        });
      } catch (error) {
        appLogger.error(
          { error, jobType: req.params.jobType },
          "[JobHealthRoute] Reset failed",
        );
        res.status(500).json({
          error: "Reset failed",
          message: String(error),
        });
      }
    },
  );

  return router;
}

export default createJobHealthRoutes;
