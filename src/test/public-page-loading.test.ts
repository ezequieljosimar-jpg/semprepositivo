import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/journey", () => ({ getProgress: vi.fn(), completeDay: vi.fn() }));
import { getProgress } from "@/lib/journey";
import { Route } from "@/routes/__root";

describe("Public page rendering", () => {
  it("renders landing and login without waiting for the progress server", async () => {
    vi.mocked(getProgress).mockClear();
    for (const pathname of ["/", "/login", "/auth/retorno"]) {
      const result = await Route.options.beforeLoad!({ location: { pathname } } as never);
      expect(result).toMatchObject({ progressDeferred: true });
    }
    expect(getProgress).not.toHaveBeenCalled();
  });
  it("still loads verified server progress on devotional pages", async () => {
    vi.mocked(getProgress).mockResolvedValue({ completed: 2, currentDay: 3, ownerId: "buyer", nextAvailableAt: null });
    const result = await Route.options.beforeLoad!({ location: { pathname: "/dia/3" } } as never);
    expect(getProgress).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ progressDeferred: false, progress: { completed: 2, ownerId: "buyer" } });
  });
});
