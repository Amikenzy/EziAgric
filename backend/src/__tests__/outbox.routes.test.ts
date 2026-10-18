import express from "express";
import request from "supertest";

jest.mock("../middleware/admin.middleware", () => ({
  adminMiddleware: (_req: any, _res: any, next: any) => next(),
}));

jest.mock("../middleware/logger", () => ({
  appLogger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

jest.mock("../lib/outbox/outboxScanner", () => ({
  scanOutboxCompleteness: jest.fn(),
  generateOutboxGapReport: jest.fn(),
  exportOutboxGaps: jest.fn(),
}));

const mockPrisma = {
  chainEventOutbox: {
    count: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock("../lib/db", () => ({ prisma: mockPrisma }));

import { createOutboxRoutes } from "../routes/outbox.routes";
import {
  scanOutboxCompleteness,
  generateOutboxGapReport,
  exportOutboxGaps,
} from "../lib/outbox/outboxScanner";

const mockScan = scanOutboxCompleteness as jest.Mock;
const mockGapReport = generateOutboxGapReport as jest.Mock;
const mockExport = exportOutboxGaps as jest.Mock;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(createOutboxRoutes());
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /admin/outbox/health", () => {
  it("returns 200 healthy when there are no critical gaps", async () => {
    mockScan.mockResolvedValue({
      summary: { criticalGaps: 0 },
      gapsDetected: [],
    });

    const res = await request(buildApp()).get("/admin/outbox/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
    expect(res.body.gapCount).toBe(0);
    expect(res.body.criticalGapsPresent).toBe(false);
    expect(mockScan).toHaveBeenCalledWith(60);
  });

  it("returns 500 degraded when critical gaps are present", async () => {
    mockScan.mockResolvedValue({
      summary: { criticalGaps: 2 },
      gapsDetected: [{ id: 1 }, { id: 2 }],
    });

    const res = await request(buildApp()).get(
      "/admin/outbox/health?timeWindow=15",
    );

    expect(res.status).toBe(500);
    expect(res.body.status).toBe("degraded");
    expect(res.body.gapCount).toBe(2);
    expect(res.body.criticalGapsPresent).toBe(true);
    expect(mockScan).toHaveBeenCalledWith(15);
  });

  it("returns 500 when the scan throws", async () => {
    mockScan.mockRejectedValue(new Error("boom"));

    const res = await request(buildApp()).get("/admin/outbox/health");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Consistency check failed");
  });
});

describe("GET /admin/outbox/gaps", () => {
  const report = { gaps: [{ id: 1 }], total: 1 };

  beforeEach(() => {
    mockGapReport.mockResolvedValue(report);
  });

  it("returns the JSON report by default", async () => {
    const res = await request(buildApp()).get("/admin/outbox/gaps");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(report);
    expect(mockExport).not.toHaveBeenCalled();
  });

  it("passes start/end query params to the report generator", async () => {
    await request(buildApp()).get(
      "/admin/outbox/gaps?start=2024-01-01T00:00:00Z&end=2024-01-02T00:00:00Z",
    );

    const [start, end] = mockGapReport.mock.calls[0];
    expect(start.toISOString()).toBe("2024-01-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2024-01-02T00:00:00.000Z");
  });

  it("exports CSV with text/csv content type", async () => {
    mockExport.mockResolvedValue("id,type\n1,x");

    const res = await request(buildApp()).get("/admin/outbox/gaps?format=csv");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/csv/);
    expect(res.text).toBe("id,type\n1,x");
    expect(mockExport).toHaveBeenCalledWith(report.gaps, "csv");
  });

  it("exports markdown with text/markdown content type", async () => {
    mockExport.mockResolvedValue("# Gaps");

    const res = await request(buildApp()).get(
      "/admin/outbox/gaps?format=markdown",
    );

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/markdown/);
    expect(res.text).toBe("# Gaps");
    expect(mockExport).toHaveBeenCalledWith(report.gaps, "markdown");
  });

  it("returns 500 when report generation fails", async () => {
    mockGapReport.mockRejectedValue(new Error("db down"));

    const res = await request(buildApp()).get("/admin/outbox/gaps");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Gap report generation failed");
  });
});

describe("GET /admin/outbox/stats", () => {
  it("returns counts and the age of the oldest pending event", async () => {
    mockPrisma.chainEventOutbox.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    mockPrisma.chainEventOutbox.findFirst.mockResolvedValue({
      id: 7,
      createdAt: new Date(Date.now() - 60_000),
    });

    const res = await request(buildApp()).get("/admin/outbox/stats");

    expect(res.status).toBe(200);
    expect(res.body.outboxStats).toMatchObject({
      totalEvents: 10,
      pendingEvents: 3,
      processedEvents: 5,
      deadLetteredEvents: 1,
      retryingEvents: 1,
      oldestPendingId: 7,
    });
    expect(res.body.outboxStats.oldestPendingAge).toBeGreaterThanOrEqual(59);
    expect(res.body.timestamp).toBeDefined();
  });

  it("returns null age when nothing is pending", async () => {
    mockPrisma.chainEventOutbox.count.mockResolvedValue(0);
    mockPrisma.chainEventOutbox.findFirst.mockResolvedValue(null);

    const res = await request(buildApp()).get("/admin/outbox/stats");

    expect(res.status).toBe(200);
    expect(res.body.outboxStats.oldestPendingAge).toBeNull();
  });

  it("returns 500 when the query fails", async () => {
    mockPrisma.chainEventOutbox.count.mockRejectedValue(new Error("fail"));

    const res = await request(buildApp()).get("/admin/outbox/stats");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Stats retrieval failed");
  });
});

describe("POST /admin/outbox/replay", () => {
  it("returns 400 when neither eventId nor tradeId is provided", async () => {
    const res = await request(buildApp()).post("/admin/outbox/replay").send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/eventId or tradeId/);
    expect(mockPrisma.chainEventOutbox.findFirst).not.toHaveBeenCalled();
  });

  it("returns 404 when the event is not found", async () => {
    mockPrisma.chainEventOutbox.findFirst.mockResolvedValue(null);

    const res = await request(buildApp())
      .post("/admin/outbox/replay")
      .send({ eventId: 99 });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Event not found");
    expect(mockPrisma.chainEventOutbox.update).not.toHaveBeenCalled();
  });

  it("resets a found event to PENDING by eventId", async () => {
    mockPrisma.chainEventOutbox.findFirst.mockResolvedValue({
      id: 5,
      tradeId: "t-1",
    });
    mockPrisma.chainEventOutbox.update.mockResolvedValue({});

    const res = await request(buildApp())
      .post("/admin/outbox/replay")
      .send({ eventId: "5" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      message: "Event queued for replay",
      eventId: 5,
      tradeId: "t-1",
    });
    expect(mockPrisma.chainEventOutbox.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 5 } }),
    );
    expect(mockPrisma.chainEventOutbox.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: expect.objectContaining({
          status: "PENDING",
          attempts: 0,
          lastError: null,
        }),
      }),
    );
  });

  it("looks the event up by tradeId when eventId is absent", async () => {
    mockPrisma.chainEventOutbox.findFirst.mockResolvedValue({
      id: 8,
      tradeId: "t-2",
    });
    mockPrisma.chainEventOutbox.update.mockResolvedValue({});

    const res = await request(buildApp())
      .post("/admin/outbox/replay")
      .send({ tradeId: "t-2" });

    expect(res.status).toBe(200);
    expect(mockPrisma.chainEventOutbox.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tradeId: "t-2" } }),
    );
  });

  it("returns 500 when the update fails", async () => {
    mockPrisma.chainEventOutbox.findFirst.mockResolvedValue({
      id: 5,
      tradeId: "t-1",
    });
    mockPrisma.chainEventOutbox.update.mockRejectedValue(new Error("fail"));

    const res = await request(buildApp())
      .post("/admin/outbox/replay")
      .send({ eventId: 5 });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Event replay failed");
  });
});
