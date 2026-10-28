import { jest } from "@jest/globals";

// Mock PostgreSQL pool and Redis so tests need no running services.
export const mockPool = { query: jest.fn() };
export const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  connect: jest.fn(),
  on: jest.fn(),
};

jest.unstable_mockModule("../db.js", () => ({ default: mockPool }));
jest.unstable_mockModule("../redis.js", () => ({ default: mockRedis }));
