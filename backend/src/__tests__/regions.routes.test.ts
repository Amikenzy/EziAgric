import request from "supertest";
import express from "express";

const mockFindMany = jest.fn();

jest.mock("../lib/db", () => ({
  prisma: { region: { findMany: mockFindMany } },
}));

import regionsRouter from "../routes/regions";

const LAGOS = {
  id: "r1",
  name: "Lagos",
  code: "LA",
  lgas: [{ id: "l1", name: "Ikeja" }],
};
const KANO = {
  id: "r2",
  name: "Kano",
  code: "KN",
  lgas: [{ id: "l2", name: "Nasarawa" }],
};

describe("GET /regions", () => {
  let app: express.Application;

  beforeEach(() => {
    mockFindMany.mockReset();
    app = express();
    app.use("/regions", regionsRouter);
  });

  it("returns all regions with LGAs ordered by name when no filter is given", async () => {
    mockFindMany.mockResolvedValue([KANO, LAGOS]);

    const res = await request(app).get("/regions");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: [KANO, LAGOS],
      pageInfo: { nextCursor: null, hasNextPage: false, limit: 20 },
    });
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: undefined,
      include: { lgas: true },
      take: 21,
      orderBy: [{ name: "asc" }, { id: "asc" }],
    }));
  });

  it("filters by state name case-insensitively", async () => {
    mockFindMany.mockResolvedValue([LAGOS]);

    const res = await request(app).get("/regions").query({ state: "  lAgOs " });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: [LAGOS],
      pageInfo: { nextCursor: null, hasNextPage: false, limit: 20 },
    });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { name: { equals: "lAgOs", mode: "insensitive" } },
            { code: { equals: "lAgOs", mode: "insensitive" } },
          ],
        },
      })
    );
  });

  it("filters by state code case-insensitively", async () => {
    mockFindMany.mockResolvedValue([KANO]);

    const res = await request(app).get("/regions").query({ state: "kn" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: [KANO],
      pageInfo: { nextCursor: null, hasNextPage: false, limit: 20 },
    });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { name: { equals: "kn", mode: "insensitive" } },
            { code: { equals: "kn", mode: "insensitive" } },
          ],
        },
      })
    );
  });

  it("returns an empty list when no region matches", async () => {
    mockFindMany.mockResolvedValue([]);

    const res = await request(app).get("/regions").query({ state: "Atlantis" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: [],
      pageInfo: { nextCursor: null, hasNextPage: false, limit: 20 },
    });
  });

  it("returns 500 when the database query fails", async () => {
    mockFindMany.mockRejectedValue(new Error("db down"));

    const res = await request(app).get("/regions");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Failed to fetch regions" });
  });
});
