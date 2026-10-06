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
