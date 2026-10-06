import { useSession as createCookieSession, setResponseHeader } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";
import { z } from "zod";
import { accountClient, accountsEnabled } from "./supabase.server";
import { ACCOUNT_PATHS, accessDecision } from "./accounts";
import { progressFrom, type Progress } from "./progression";

type AuthData = { accessToken?: string; refreshToken?: string };
async function authSession() {
  if (!accountsEnabled()) throw new Error("Accounts are not enabled.");
  const password = process.env["PROGRESS_SESSION_SECRET"];
  if (!password || password.length < 32) throw new Error("Configure the server session secret.");
  setResponseHeader("Cache-Control", "private, no-store");
  return createCookieSession<AuthData>({
    name: "sempre-positivo-account",
    password,
    maxAge: 60 * 60 * 24 * 365 * 10,
    sessionHeader: false,
    cookie: {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      path: "/",
    },
  });
}

export async function currentAccount() {
  const session = await authSession();
  if (!session.data.accessToken) return null;
  const auth = accountClient();
  let token = session.data.accessToken;
  let checked = await auth.auth.getUser(token);
  if (checked.error && session.data.refreshToken) {
    const refreshed = await auth.auth.refreshSession({ refresh_token: session.data.refreshToken });
    if (refreshed.error || !refreshed.data.session) return null;
    token = refreshed.data.session.access_token;
    checked = await auth.auth.getUser(token);
    if (!checked.error)
      await session.update({
        accessToken: token,
        refreshToken: refreshed.data.session.refresh_token,
      });
  }
  if (checked.error || !checked.data.user || !checked.data.user.email_confirmed_at) return null;
  const client = accountClient(token);
  const { data, error } = await client
    .from("devotional_access")
    .select("access_status, access_started_at, expires_at, updated_at")
    .eq("user_id", checked.data.user.id)
    .maybeSingle();
  if (error) throw new Error("Could not verify product access.");
  const access = z
    .object({
      access_status: z.enum(["pending", "active", "expired", "cancelled"]),
      expires_at: z.string().nullable(),
      access_started_at: z.string().nullable(),
      updated_at: z.string(),
    })
    .nullable()
    .parse(data);
  return { user: checked.data.user, client, access };
}

async function requireAccess() {
  const account = await currentAccount();
  const decision = accessDecision(
    account?.user.id ?? null,
    account?.access?.access_status ?? null,
    account?.access?.expires_at ?? null,
  );
  if (decision === "login") throw redirect({ href: ACCOUNT_PATHS.login });
  if (decision === "denied") throw redirect({ href: ACCOUNT_PATHS.denied });
  return account!;
}

const persistedProgress = z.object({
  completed: z.number().int().min(0).max(90),
  currentDay: z.number().int().min(1).max(90).nullable(),
  ownerId: z.string().uuid(),
});
function checkedProgress(data: unknown, userId: string): Progress {
  const result = persistedProgress.parse(data);
  const canonical = progressFrom(result.completed);
  if (result.ownerId !== userId || result.currentDay !== canonical.currentDay)
    throw new Error("Invalid account progress.");
  return { ...canonical, ownerId: userId };
}

export function accountProgress(publicView = false) {
  return {
    async read(): Promise<Progress> {
      if (publicView) {
        const account = await currentAccount();
        if (
          accessDecision(
            account?.user.id ?? null,
            account?.access?.access_status ?? null,
            account?.access?.expires_at ?? null,
          ) !== "allowed"
        )
          return { ...progressFrom(0), ownerId: account?.user.id ?? null };
      }
      const account = await requireAccess();
      const { data, error } = await account.client.rpc("get_devotional_progress");
      if (error) throw new Error("Could not load account progress.");
      return checkedProgress(data, account.user.id);
    },
    async complete(day: number): Promise<Progress> {
      const account = await requireAccess();
      const { data, error } = await account.client.rpc("complete_devotional_day", { p_day: day });
      if (error) throw new Error("Could not complete this day.");
      return checkedProgress(data, account.user.id);
    },
  };
}

export async function signInAccount(email: string, password: string) {
  const session = await authSession();
  const { data, error } = await accountClient().auth.signInWithPassword({ email, password });
  if (error || !data.session)
    return { ok: false, message: "Não foi possível entrar. Confira seus dados." };
  await session.update({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  });
  return { ok: true };
}

export async function registerAccount(email: string, password: string, name?: string) {
  await authSession();
  const { error } = await accountClient().auth.signUp({
    email,
    password,
    options: { data: { full_name: name ?? null } },
  });
  if (error) return { ok: false, message: "Não foi possível cadastrar a conta." };
  // Signing up never grants product access or bypasses email confirmation.
  return { ok: true, message: "Confira seu e-mail para confirmar a conta." };
}

export async function signOutAccount() {
  const session = await authSession();
  if (session.data.accessToken)
    await accountClient().auth.admin.signOut(session.data.accessToken, "local");
  await session.clear();
  return { ok: true };
}
