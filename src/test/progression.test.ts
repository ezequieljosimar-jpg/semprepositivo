import { describe, it, expect } from "vitest";
import { progressFrom, canRead, completeSequentially } from "@/lib/progression";

describe("Sequential 90-day journey", () => {
  it("starts with only day one available", () => {
    const p = progressFrom(undefined);
    expect(p.currentDay).toBe(1);
    expect(canRead(p, 1)).toBe(true);
    for (let n = 2; n <= 90; n++) expect(canRead(p, n)).toBe(false);
  });
  it("unlocks the next day only after completion and keeps prior days", () => {
    let p = progressFrom(0);
    expect(canRead(p, 1)).toBe(true);
    expect(p.completed).toBe(0);
    p = completeSequentially(p, 1);
    expect(canRead(p, 2)).toBe(true);
    expect(canRead(p, 3)).toBe(false);
    expect(canRead(p, 1)).toBe(true);
    expect(completeSequentially(p, 1)).toEqual(p);
    expect(() => completeSequentially(p, 3)).toThrow();
    const restored = progressFrom(JSON.parse(JSON.stringify(p)).completed);
    expect(restored).toEqual(p);
    expect(completeSequentially(restored, 2).currentDay).toBe(3);
  });
  it("never changes progress based on elapsed calendar time", () => {
    const saved = progressFrom(17);
    expect(progressFrom(saved.completed)).toEqual({ completed: 17, currentDay: 18 });
    expect(canRead(saved, 17)).toBe(true);
    expect(canRead(saved, 18)).toBe(true);
    expect(canRead(saved, 30)).toBe(false);
  });
  it("completes all 90 days in order without relocking any day", () => {
    let p = progressFrom(0);
    for (let n = 1; n <= 90; n++) p = completeSequentially(p, n);
    expect(p).toEqual({ completed: 90, currentDay: null });
    for (let n = 1; n <= 90; n++) expect(canRead(p, n)).toBe(true);
  });
  it("rejects malformed days and invalid persisted counters", () => {
    for (const n of [0, -1, 91, 1.5, NaN]) {
      expect(canRead(progressFrom(90), n)).toBe(false);
      expect(() => completeSequentially(progressFrom(90), n)).toThrow();
    }
    for (const n of [-1, 91, NaN, 2.3, "90"]) expect(progressFrom(n).completed).toBe(0);
  });
});
