import { describe, it, expect, vi } from "vitest";
import { processVerifiedNotification } from "@/lib/payment-provider.server";

describe("Unconfigured payment boundary", () => {
  it("does nothing when no real provider has been configured", async () => {
    const apply = vi.fn();
    const resolveVerifiedBuyer = vi.fn();
    await expect(
      processVerifiedNotification("unconfigured", new Uint8Array(), new Headers(), {
        adapters: new Map(),
        apply,
        resolveVerifiedBuyer,
      }),
    ).rejects.toThrow("not configured");
    expect(apply).not.toHaveBeenCalled();
    expect(resolveVerifiedBuyer).not.toHaveBeenCalled();
  });
  it("never normalizes or grants access before a signature is verified", async () => {
    const normalize = vi.fn();
    const apply = vi.fn();
    const resolveVerifiedBuyer = vi.fn();
    const adapters = new Map([
      ["isolated-test-adapter", { verifySignature: async () => false, normalize }],
    ]);
    await expect(
      processVerifiedNotification("isolated-test-adapter", new Uint8Array(), new Headers(), {
        adapters,
        apply,
        resolveVerifiedBuyer,
      }),
    ).rejects.toThrow("signature");
    expect(normalize).not.toHaveBeenCalled();
    expect(apply).not.toHaveBeenCalled();
    expect(resolveVerifiedBuyer).not.toHaveBeenCalled();
  });
});
