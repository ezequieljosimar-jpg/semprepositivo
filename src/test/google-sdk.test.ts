// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const cookie = vi.hoisted(() => ({
  data: {} as Record<string, unknown>,
  options: {} as Record<string, unknown>,
}));
vi.mock("@tanstack/react-start/server", () => ({
  getRequest: () => {
    throw new Error("local SDK test");
  },
  setResponseHeader: vi.fn(),
  useSession: async (options: Record<string, unknown>) => {
    cookie.options = options;
    return {
      data: cookie.data,
      update: async (value: Record<string, unknown>) => Object.assign(cookie.data, value),
    };
  },
}));
import { beginGoogleAccount, finishGoogleAccount } from "@/lib/account-session.server";
const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
beforeEach(() => {
  cookie.data = {};
  requests.length = 0;
  vi.stubEnv("SUPABASE_URL", "https://auth.example.invalid");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "isolated-test-public-key");
  vi.stubEnv("PROGRESS_SESSION_SECRET", "isolated-test-only-secret-32-characters");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      requests.push({ url, body });
      if (url.endsWith("/settings")) return Response.json({ external: { google: true } });
      if (url.includes("/token"))
        return Response.json({
          access_token: "isolated-token",
          refresh_token: "isolated-refresh",
          token_type: "bearer",
          expires_in: 3600,
          user: {
            id: "00000000-0000-4000-8000-000000000001",
            email_confirmed_at: "2026-01-01",
            aud: "authenticated",
          },
        });
      if (url.endsWith("/user"))
        return Response.json({
          id: "00000000-0000-4000-8000-000000000001",
          email_confirmed_at: "2026-01-01",
          aud: "authenticated",
        });
      throw new Error("Unexpected local fixture request");
    }),
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("uses the real Supabase SDK PKCE flow and persists its verifier across client instances", async () => {
  const started = await beginGoogleAccount();
  expect(started.ok).toBe(true);
  const target = new URL(started.url!);
  expect(target.searchParams.get("provider")).toBe("google");
  expect(target.searchParams.get("code_challenge_method")).toBe("s256");
  expect(target.searchParams.get("redirect_to")).toContain("/auth/retorno");
  expect(cookie.data["oauthStorage"]).toBeTruthy();
  expect(cookie.options).toMatchObject({
    sessionHeader: false,
    cookie: { httpOnly: true, sameSite: "lax" },
  });
  expect(Number(cookie.options["maxAge"])).toBeGreaterThan(0);
  expect(await finishGoogleAccount("isolated-authorization-code")).toEqual({ ok: true });
  const exchange = requests.find((request) => request.url.includes("/token"))!;
  expect(exchange.body["auth_code"]).toBe("isolated-authorization-code");
  expect(typeof exchange.body["code_verifier"]).toBe("string");
  expect(String(exchange.body["code_verifier"]).length).toBeGreaterThan(30);
  expect(cookie.data["accessToken"]).toBe("isolated-token");
  expect(cookie.data["oauthStorage"]).toBeUndefined();
  expect(requests.some((request) => request.url.includes("/rest/v1/"))).toBe(false);
});
it("checks the backend and refuses Google when it is not configured", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ external: { google: false } })),
  );
  const result = await beginGoogleAccount();
  expect(result.ok).toBe(false);
  expect(result.url).toBeNull();
  expect(cookie.data).toEqual({});
});
