import { jest } from "@jest/globals";
import { mockPool, mockRedis } from "./setup.js";

const { default: request } = await import("supertest");
const { default: app } = await import("../server.js");

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/todos", () => {
  it("returns todos from the DB on cache miss and caches them", async () => {
    const rows = [{ id: 1, text: "a" }];
    mockRedis.get.mockResolvedValue(null);
    mockPool.query.mockResolvedValue({ rows });

    const res = await request(app).get("/api/todos");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(rows);
    expect(mockRedis.set).toHaveBeenCalled();
  });

  it("returns cached todos without hitting the DB", async () => {
    mockRedis.get.mockResolvedValue(
      JSON.stringify([{ id: 2, text: "cached" }]),
    );

    const res = await request(app).get("/api/todos");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 2, text: "cached" }]);
    expect(mockPool.query).not.toHaveBeenCalled();
  });
});

describe("POST /api/todos", () => {
  it("creates a todo", async () => {
    mockPool.query.mockResolvedValue({ rows: [{ id: 1, text: "new" }] });

    const res = await request(app).post("/api/todos").send({ text: "  new  " });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 1, text: "new" });
    expect(mockRedis.del).toHaveBeenCalledWith("todos:all");
  });

  it("rejects empty text", async () => {
    const res = await request(app).post("/api/todos").send({ text: "   " });
    expect(res.status).toBe(400);
  });

  it("rejects text longer than 255 chars", async () => {
    const res = await request(app)
      .post("/api/todos")
      .send({ text: "x".repeat(256) });
    expect(res.status).toBe(400);
  });
});

describe("PUT /api/todos/:id", () => {
  it("updates a todo", async () => {
    mockPool.query.mockResolvedValue({
      rowCount: 1,
      rows: [{ id: 1, text: "edited" }],
    });

    const res = await request(app).put("/api/todos/1").send({ text: "edited" });

    expect(res.status).toBe(200);
    expect(res.body.text).toBe("edited");
    expect(mockRedis.del).toHaveBeenCalledWith("todos:all");
  });

  it("returns 404 when todo does not exist", async () => {
    mockPool.query.mockResolvedValue({ rowCount: 0, rows: [] });
    const res = await request(app).put("/api/todos/99").send({ text: "x" });
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid id", async () => {
    const res = await request(app).put("/api/todos/abc").send({ text: "x" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty text", async () => {
    const res = await request(app).put("/api/todos/1").send({ text: "" });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/todos/:id", () => {
  it("deletes a todo", async () => {
    mockPool.query.mockResolvedValue({ rowCount: 1, rows: [{ id: 1 }] });

    const res = await request(app).delete("/api/todos/1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Todo deleted" });
    expect(mockRedis.del).toHaveBeenCalledWith("todos:all");
  });

  it("returns 404 when todo does not exist", async () => {
    mockPool.query.mockResolvedValue({ rowCount: 0, rows: [] });
    const res = await request(app).delete("/api/todos/99");
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid id", async () => {
    const res = await request(app).delete("/api/todos/0");
    expect(res.status).toBe(400);
  });
});
