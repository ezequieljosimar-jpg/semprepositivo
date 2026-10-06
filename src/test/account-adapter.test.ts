import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const session = {
    data: {} as { accessToken?: string; refreshToken?: string },
    update: vi.fn(),
    clear: vi.fn(),
  };
  const access = {
    access_status: "active",
    expires_at: null,
    access_started_at: null,
    updated_at: "2026-01-01T00:00:00Z",
  };
  const result = { data: access, error: null };
  const maybeSingle = vi.fn(async () => result);
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const client = {
    from: vi.fn(() => ({ select })),
    rpc: vi.fn(),
    auth: { getUser: vi.fn(), refreshSession: vi.fn() },
  };
  return { session, access, result, client, eq };
});
vi.mock("@tanstack/react-start/server", () => ({
  useSession: async () => mocks.session,
  setResponseHeader: vi.fn(),
}));
vi.mock("@/lib/supabase.server", () => ({
  accountsEnabled: () => true,
  accountClient: () => mocks.client,
}));
import { accountProgress } from "@/lib/account-session.server";

const A = "00000000-0000-4000-8000-000000000001";
const B = "00000000-0000-4000-8000-000000000002";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("PROGRESS_SESSION_SECRET", "isolated-test-only-session-secret-32-characters");
  mocks.session.data = { accessToken: "isolated-test-token" };
  mocks.access.access_status = "active";
  mocks.client.auth.getUser.mockResolvedValue({
    data: { user: { id: A, email_confirmed_at: "2026-01-01T00:00:00Z" } },
    error: null,
  });
  mocks.client.rpc.mockResolvedValue({
    data: { completed: 0, currentDay: 1, ownerId: A },
    error: null,
  });
});
afterEach(() => vi.unstubAllEnvs());

describe("Account server boundary (isolated Auth adapter)", () => {
  it("redirects signed-out reading requests to login", async () => {
    mocks.session.data = {};
    await expect(accountProgress().read()).rejects.toMatchObject({ options: { href: "/login" } });
    expect(mocks.client.rpc).not.toHaveBeenCalled();
  });
  it("redirects an authenticated buyer without active access", async () => {
    mocks.access.access_status = "pending";
    await expect(accountProgress().read()).rejects.toMatchObject({
      options: { href: "/acesso-negado" },
    });
    expect(mocks.client.rpc).not.toHaveBeenCalled();
  });
  it("verifies identity with Auth and reads only the caller's database progress", async () => {
    expect(await accountProgress().read()).toEqual({ completed: 0, currentDay: 1, ownerId: A });
    expect(mocks.client.auth.getUser).toHaveBeenCalledWith("isolated-test-token");
    expect(mocks.eq).toHaveBeenCalledWith("user_id", A);
    expect(mocks.client.rpc).toHaveBeenCalledWith("get_devotional_progress");
  });
  it("rejects another account's progress even if a database response is incorrect", async () => {
    mocks.client.rpc.mockResolvedValue({
      data: { completed: 17, currentDay: 18, ownerId: B },
      error: null,
    });
    await expect(accountProgress().read()).rejects.toThrow("Invalid account progress");
  });
  it("does not turn a failed completion into a successful client-side advance", async () => {
    mocks.client.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
    await expect(accountProgress().complete(3)).rejects.toThrow();
    expect(mocks.client.rpc).toHaveBeenCalledWith("complete_devotional_day", { p_day: 3 });
  });
  it("never trusts a session token without a successful verified Auth user", async () => {
    mocks.client.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "invalid" },
    });
    await expect(accountProgress().read()).rejects.toMatchObject({ options: { href: "/login" } });
    expect(mocks.client.rpc).not.toHaveBeenCalled();
  });
});
