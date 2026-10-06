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
    auth: {
      getUser: vi.fn(),
      refreshSession: vi.fn(),
      setSession: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      admin: { signOut: vi.fn() },
      updateUser: vi.fn(),
    },
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
import {
  accountProgress,
  acceptAccountSession,
  recoverAccount,
  registerAccount,
  signInAccount,
  signOutAccount,
  currentAccount,
  changeAccountPassword,
} from "@/lib/account-session.server";

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

it("rejects email-return tokens that Auth cannot validate", async () => {
  mocks.client.auth.setSession.mockResolvedValue({
    data: { session: null },
    error: { message: "invalid" },
  });
  expect(await acceptAccountSession("invalid", "invalid")).toEqual({ ok: false });
  expect(mocks.session.update).not.toHaveBeenCalled();
});
it("does not establish an account until Auth confirms the email", async () => {
  mocks.client.auth.setSession.mockResolvedValue({
    data: { session: { access_token: "test", refresh_token: "test-refresh" } },
    error: null,
  });
  mocks.client.auth.getUser.mockResolvedValue({
    data: { user: { id: A, email_confirmed_at: null } },
    error: null,
  });
  expect(await acceptAccountSession("test", "test-refresh")).toEqual({ ok: false });
  expect(mocks.session.update).not.toHaveBeenCalled();
});
it("stores a verified email-return session without granting access", async () => {
  mocks.client.auth.setSession.mockResolvedValue({
    data: { session: { access_token: "test", refresh_token: "test-refresh" } },
    error: null,
  });
  expect(await acceptAccountSession("test", "test-refresh")).toEqual({ ok: true });
  expect(mocks.session.update).toHaveBeenCalledWith({
    accessToken: "test",
    refreshToken: "test-refresh",
  });
  expect(mocks.client.rpc).not.toHaveBeenCalled();
});
it("returns a neutral recovery response without disclosing account existence", async () => {
  mocks.client.auth.resetPasswordForEmail.mockResolvedValue({
    data: null,
    error: { message: "not found" },
  });
  expect((await recoverAccount("isolated@example.invalid")).ok).toBe(true);
  expect(mocks.client.auth.resetPasswordForEmail).toHaveBeenCalledWith("isolated@example.invalid", {
    redirectTo: "https://semprepositivo.lovable.app/auth/retorno",
  });
});
it("keeps public navigation available before the secret is configured and denies reading", async () => {
  vi.stubEnv("PROGRESS_SESSION_SECRET", "");
  expect(await accountProgress(true).read()).toEqual({
    completed: 0,
    currentDay: 1,
    ownerId: null,
  });
  await expect(accountProgress().read()).rejects.toMatchObject({ options: { href: "/login" } });
  expect(mocks.client.rpc).not.toHaveBeenCalled();
});

it("reports disabled email signup without storing a session or granting access", async () => {
  mocks.client.auth.signUp.mockResolvedValue({
    data: {},
    error: { code: "email_provider_disabled" },
  });
  const result = await registerAccount(
    "isolated@example.invalid",
    "isolated-password",
    "Teste local",
  );
  expect(result.ok).toBe(false);
  expect(result.message).toContain("cadastro por e-mail está temporariamente indisponível");
  expect(mocks.session.update).not.toHaveBeenCalled();
  expect(mocks.client.rpc).not.toHaveBeenCalled();
});
it("registers with the account confirmation callback and never grants product access", async () => {
  mocks.client.auth.signUp.mockResolvedValue({
    data: { user: { id: A }, session: null },
    error: null,
  });
  expect(
    (await registerAccount("isolated@example.invalid", "isolated-password", "Teste local")).ok,
  ).toBe(true);
  expect(mocks.client.auth.signUp).toHaveBeenCalledWith({
    email: "isolated@example.invalid",
    password: "isolated-password",
    options: {
      data: { full_name: "Teste local" },
      emailRedirectTo: "https://semprepositivo.lovable.app/auth/retorno",
    },
  });
  expect(mocks.session.update).not.toHaveBeenCalled();
  expect(mocks.client.rpc).not.toHaveBeenCalled();
});
it("signs in an individual account and persists only its session tokens", async () => {
  mocks.client.auth.signInWithPassword.mockResolvedValue({
    data: { session: { access_token: "local-access", refresh_token: "local-refresh" } },
    error: null,
  });
  expect(await signInAccount("isolated@example.invalid", "isolated-password")).toEqual({
    ok: true,
  });
  expect(mocks.session.update).toHaveBeenCalledWith({
    accessToken: "local-access",
    refreshToken: "local-refresh",
  });
});
it("does not establish a session after invalid credentials or unconfirmed email", async () => {
  mocks.client.auth.signInWithPassword.mockResolvedValue({
    data: { session: null },
    error: { code: "email_not_confirmed" },
  });
  expect((await signInAccount("isolated@example.invalid", "wrong-password")).message).toContain(
    "Confirme seu e-mail",
  );
  expect(mocks.session.update).not.toHaveBeenCalled();
});
it("clears the local account cookie and revokes its remote session on logout", async () => {
  mocks.client.auth.admin.signOut.mockResolvedValue({ error: null });
  expect(await signOutAccount()).toEqual({ ok: true });
  expect(mocks.client.auth.admin.signOut).toHaveBeenCalledWith("isolated-test-token", "local");
  expect(mocks.session.clear).toHaveBeenCalled();
});
it("refreshes expired tokens and verifies identity again before reading a profile", async () => {
  mocks.session.data = { accessToken: "expired", refreshToken: "refresh" };
  mocks.client.auth.getUser
    .mockResolvedValueOnce({ data: { user: null }, error: { message: "expired" } })
    .mockResolvedValueOnce({
      data: { user: { id: A, email_confirmed_at: "2026-01-01" } },
      error: null,
    });
  mocks.client.auth.refreshSession.mockResolvedValue({
    data: { session: { access_token: "renewed", refresh_token: "new-refresh" } },
    error: null,
  });
  expect((await currentAccount())?.user.id).toBe(A);
  expect(mocks.client.auth.getUser).toHaveBeenLastCalledWith("renewed");
  expect(mocks.eq).toHaveBeenCalledWith("user_id", A);
});
it("rejects a forged account callback even when setSession returns data", async () => {
  mocks.client.auth.setSession.mockResolvedValue({
    data: { session: { access_token: "forged", refresh_token: "forged-refresh" } },
    error: null,
  });
  mocks.client.auth.getUser.mockResolvedValue({
    data: { user: null },
    error: { message: "invalid" },
  });
  expect(await acceptAccountSession("forged", "forged-refresh")).toEqual({ ok: false });
  expect(mocks.session.update).not.toHaveBeenCalled();
});
it("requires an authenticated account before changing a password", async () => {
  mocks.session.data = {};
  expect((await changeAccountPassword("new-local-password")).ok).toBe(false);
  expect(mocks.client.auth.updateUser).not.toHaveBeenCalled();
});
it("does not claim recovery succeeded when the provider is disabled", async () => {
  mocks.client.auth.resetPasswordForEmail.mockResolvedValue({
    data: null,
    error: { code: "email_provider_disabled" },
  });
  expect((await recoverAccount("isolated@example.invalid")).ok).toBe(false);
});
