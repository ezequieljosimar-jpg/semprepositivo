import { describe, it, expect } from "vitest";
import { progressFrom, canRead, completeSequentially, DAY_WAIT_MS } from "@/lib/progression";
const start = Date.parse("2026-10-06T23:00:00Z");
describe("Sequential journey with 12-hour release", () => {
  it("starts with only day one and never unlocks unread future days with time alone", () => {
    const p = progressFrom(0);
    expect(canRead(p, 1, start)).toBe(true);
    for (let n = 2; n <= 90; n++) expect(canRead(p, n, start + DAY_WAIT_MS * 90)).toBe(false);
  });
  it("blocks reading and completing the next day until exactly 12 hours", () => {
    const p = completeSequentially(progressFrom(0), 1, start);
    expect(p.nextAvailableAt).toBe("2026-10-07T11:00:00.000Z");
    expect(canRead(p, 1, start)).toBe(true);
    expect(canRead(p, 2, start + DAY_WAIT_MS - 1)).toBe(false);
    expect(() => completeSequentially(p, 2, start + DAY_WAIT_MS - 1)).toThrow();
    expect(canRead(p, 2, start + DAY_WAIT_MS)).toBe(true);
    expect(canRead(p, 3, start + DAY_WAIT_MS * 100)).toBe(false);
    expect(completeSequentially(p, 1, start + 1000)).toEqual(p);
    expect(progressFrom(p.completed, p.nextAvailableAt)).toEqual(p);
  });
  it("completes all 90 days without relocking past days or waiting for the closing", () => {
    let p = progressFrom(0);
    for (let n = 1; n <= 90; n++) {
      const now = start + (n - 1) * DAY_WAIT_MS;
      p = completeSequentially(p, n, now);
      for (let previous = 1; previous <= n; previous++)
        expect(canRead(p, previous, now)).toBe(true);
    }
    expect(p).toEqual({ completed: 90, currentDay: null, nextAvailableAt: null });
  });
  it("rejects malformed days, counters and timestamps", () => {
    for (const n of [0, -1, 91, 1.5, NaN]) {
      expect(canRead(progressFrom(90), n)).toBe(false);
      expect(() => completeSequentially(progressFrom(90), n)).toThrow();
    }
    for (const n of [-1, 91, NaN, 2.3, "90"]) expect(progressFrom(n).completed).toBe(0);
    expect(canRead(progressFrom(1, "invalid"), 2)).toBe(false);
  });
});
