import express from "express";
import request from "supertest";
import { createAdminExpiryRouter } from "../routes/admin.expiry.routes";
import { errorHandler } from "../middleware/errorHandler";
import { tradeExpiryService } from "../services/tradeExpiry.service";
import { tradeExpiryQueue } from "../jobs/queue";

jest.mock("../middleware/auth.middleware", () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { walletAddress: "GADMIN" };
    next();
  },
}));

jest.mock("../middleware/admin.middleware", () => ({
  adminMiddleware: (_req: any, _res: any, next: any) => next(),
}));

jest.mock("../services/tradeExpiry.service", () => ({
  tradeExpiryService: {
    sweepExpiredTrades: jest.fn(),
    getPendingRefunds: jest.fn(),
  },
}));

jest.mock("../jobs/queue", () => ({
  tradeExpiryQueue: { add: jest.fn() },
}));

const mockService = tradeExpiryService as unknown as {
  sweepExpiredTrades: jest.Mock;
  getPendingRefunds: jest.Mock;
};
const mockQueue = tradeExpiryQueue as unknown as { add: jest.Mock };

const app = express();
app.use(express.json());
app.use("/", createAdminExpiryRouter());
app.use(errorHandler);

describe("Admin Expiry Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/admin/trades/sweep-expired", () => {
    it("sweeps with the provided batchSize and returns the result", async () => {
      const result = { processed: 3, expired: 2 };
      mockService.sweepExpiredTrades.mockResolvedValue(result);

      const res = await request(app)
        .post("/api/admin/trades/sweep-expired")
        .send({ batchSize: 50 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(result);
      expect(mockService.sweepExpiredTrades).toHaveBeenCalledWith(50);
    });

    it("defaults batchSize to 100 when omitted", async () => {
      mockService.sweepExpiredTrades.mockResolvedValue({ processed: 0 });

      const res = await request(app).post("/api/admin/trades/sweep-expired").send({});

      expect(res.status).toBe(200);
      expect(mockService.sweepExpiredTrades).toHaveBeenCalledWith(100);
    });

    it.each([1, 500])("accepts boundary batchSize %i", async (batchSize) => {
      mockService.sweepExpiredTrades.mockResolvedValue({ processed: 0 });

      const res = await request(app)
        .post("/api/admin/trades/sweep-expired")
        .send({ batchSize });

      expect(res.status).toBe(200);
      expect(mockService.sweepExpiredTrades).toHaveBeenCalledWith(batchSize);
    });

    it.each([0, 501, -1, 1.5, "10"])("rejects invalid batchSize %p", async (batchSize) => {
      const res = await request(app)
        .post("/api/admin/trades/sweep-expired")
        .send({ batchSize });

      expect(res.status).toBe(400);
      expect(mockService.sweepExpiredTrades).not.toHaveBeenCalled();
    });

    it("returns 500 when the sweep fails", async () => {
      mockService.sweepExpiredTrades.mockRejectedValue(new Error("boom"));

      const res = await request(app).post("/api/admin/trades/sweep-expired").send({});

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Internal server error" });
    });
  });

  describe("POST /api/admin/trades/sweep-expired/enqueue", () => {
    it("enqueues an admin-sweep job and returns the job id", async () => {
      mockQueue.add.mockResolvedValue({ id: "job-1" });

      const res = await request(app)
        .post("/api/admin/trades/sweep-expired/enqueue")
        .send({ batchSize: 25 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ jobId: "job-1", batchSize: 25 });
      expect(mockQueue.add).toHaveBeenCalledWith("admin-sweep", { batchSize: 25 });
    });

    it("defaults batchSize to 100", async () => {
      mockQueue.add.mockResolvedValue({ id: "job-2" });

      const res = await request(app)
        .post("/api/admin/trades/sweep-expired/enqueue")
        .send({});

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ jobId: "job-2", batchSize: 100 });
    });

    it.each([0, 501])("rejects out-of-range batchSize %i", async (batchSize) => {
      const res = await request(app)
        .post("/api/admin/trades/sweep-expired/enqueue")
        .send({ batchSize });

      expect(res.status).toBe(400);
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it("returns 500 when enqueueing fails", async () => {
      mockQueue.add.mockRejectedValue(new Error("redis down"));

      const res = await request(app)
        .post("/api/admin/trades/sweep-expired/enqueue")
        .send({});

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Internal server error" });
    });
  });

  describe("GET /api/admin/trades/pending-refunds", () => {
    it("lists pending refunds with a count", async () => {
      const trades = [{ id: "t1" }, { id: "t2" }];
      mockService.getPendingRefunds.mockResolvedValue(trades);

      const res = await request(app).get("/api/admin/trades/pending-refunds");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ count: 2, trades });
    });

    it("returns an empty list when nothing is pending", async () => {
      mockService.getPendingRefunds.mockResolvedValue([]);

      const res = await request(app).get("/api/admin/trades/pending-refunds");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ count: 0, trades: [] });
    });

    it("returns 500 when the lookup fails", async () => {
      mockService.getPendingRefunds.mockRejectedValue(new Error("db"));

      const res = await request(app).get("/api/admin/trades/pending-refunds");

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Internal server error" });
    });
  });
});
