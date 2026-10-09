import { describe, it, expect } from "vitest";
import { accessDecision } from "@/lib/accounts";

describe("Access decisions", () => {
  it("requires authentication even when an untrusted client claims active access", () => {
    expect(accessDecision(null, "active", null)).toBe("login");
  });
  it("allows only active, unexpired access", () => {
    for (const status of ["pending", "expired", "cancelled", null] as const)
      expect(accessDecision("account", status, null)).toBe("denied");
    expect(accessDecision("account", "active", null)).toBe("allowed");
    expect(accessDecision("account", "active", "2000-01-01T00:00:00Z")).toBe("denied");
    expect(accessDecision("account", "active", "invalid")).toBe("denied");
  });
});

import { devotionalDecision } from "@/lib/accounts";
import { canRead } from "@/lib/progression";
it("separates invited sample access from paid entitlement", () => {
  expect(accessDecision("account", "pending", null)).toBe("denied");
  expect(devotionalDecision("account", "pending", null, "2026-10-09T00:00:00Z")).toBe("allowed");
  expect(devotionalDecision("account", "pending", null)).toBe("denied");
  expect(devotionalDecision("account", "cancelled", null, "2026-10-09T00:00:00Z")).toBe("denied");
  expect(devotionalDecision(null, "pending", null, "2026-10-09T00:00:00Z")).toBe("login");
  expect(canRead({completed:1,currentDay:2,maxReadableDay:1,nextAvailableAt:"2000-01-01T00:00:00Z"},2)).toBe(false);
});
