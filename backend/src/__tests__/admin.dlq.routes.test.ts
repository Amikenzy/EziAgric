import express from "express";
import request from "supertest";
import { createAdminDlqRouter } from "../routes/admin.dlq.routes";
import { getDeadLetterQueue } from "../jobs/deadLetter";

jest.mock("../middleware/auth.middleware", () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { walletAddress: "GADMIN" };
    next();
  },
}));
jest.mock("../middleware/admin.middleware", () => ({
  adminMiddleware: (_req: any, _res: any, next: any) => next(),
}));
jest.mock("../middleware/logger", () => ({
  appLogger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));
jest.mock("../jobs/deadLetter", () => ({ getDeadLetterQueue: jest.fn() }));
jest.mock("../jobs/queue", () => ({
  webhookQueue: { add: jest.fn() },
  notificationQueue: { add: jest.fn() },
  exportQueue: { add: jest.fn() },
  tradeExpiryQueue: { add: jest.fn() },
  reconciliationQueue: { add: jest.fn() },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { webhookQueue } = require("../jobs/queue");

const app = express();
app.use(express.json());
app.use("/", createAdminDlqRouter());

describe("Admin DLQ Routes", () => {
  const dlq = {
    getJobs: jest.fn(),
    count: jest.fn(),
    getJob: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getDeadLetterQueue as jest.Mock).mockReturnValue(dlq);
  });

  describe("unknown queue", () => {
    it("returns 404 on list", async () => {
      const res = await request(app).get("/api/admin/dlq/nope");
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Unknown queue" });
    });

    it("returns 404 on depth", async () => {
      const res = await request(app).get("/api/admin/dlq/nope/depth");
      expect(res.status).toBe(404);
    });

    it("returns 404 on replay", async () => {
      const res = await request(app).post("/api/admin/dlq/nope/job-1/replay");
      expect(res.status).toBe(404);
      expect(dlq.getJob).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/admin/dlq/:queue", () => {
    it("uses default pagination (page 1, limit 50)", async () => {
      dlq.getJobs.mockResolvedValue([{ id: "1", data: { jobName: "a" } }]);
      dlq.count.mockResolvedValue(1);

      const res = await request(app).get("/api/admin/dlq/webhooks");

      expect(res.status).toBe(200);
      expect(dlq.getJobs).toHaveBeenCalledWith(["waiting", "delayed", "active"], 0, 49);
      expect(res.body).toEqual({
        queue: "webhooks",
        depth: 1,
        jobs: [{ id: "1", jobName: "a" }],
      });
    });

    it("applies page and limit to the job range", async () => {
      dlq.getJobs.mockResolvedValue([]);
      dlq.count.mockResolvedValue(0);

      const res = await request(app).get("/api/admin/dlq/webhooks?page=3&limit=10");

      expect(res.status).toBe(200);
      expect(dlq.getJobs).toHaveBeenCalledWith(["waiting", "delayed", "active"], 20, 29);
    });

    it("rejects out-of-range pagination params", async () => {
      const res = await request(app).get("/api/admin/dlq/webhooks?limit=201");
      expect(res.status).toBe(400);
      expect(dlq.getJobs).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/admin/dlq/:queue/depth", () => {
    it("returns the dead-letter depth", async () => {
      dlq.count.mockResolvedValue(7);

      const res = await request(app).get("/api/admin/dlq/notifications/depth");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ queue: "notifications", depth: 7 });
    });
  });

  describe("POST /api/admin/dlq/:queue/:jobId/replay", () => {
    it("re-enqueues the job on its source queue and removes the DLQ entry", async () => {
      const remove = jest.fn().mockResolvedValue(undefined);
      dlq.getJob.mockResolvedValue({ data: { jobName: "deliver", data: { id: 1 } }, remove });

      const res = await request(app).post("/api/admin/dlq/webhooks/job-1/replay");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, queue: "webhooks", replayedJobId: "job-1" });
      expect(webhookQueue.add).toHaveBeenCalledWith("deliver", { id: 1 });
      expect(remove).toHaveBeenCalledTimes(1);
    });

    it("returns 404 when the job was already replayed", async () => {
      dlq.getJob.mockResolvedValue(undefined);

      const res = await request(app).post("/api/admin/dlq/webhooks/job-1/replay");

      expect(res.status).toBe(404);
      expect(webhookQueue.add).not.toHaveBeenCalled();
    });
  });
});
