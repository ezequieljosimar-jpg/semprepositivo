import { authFailureMessage } from "./auth-error";
import { serverEnv } from "./server-env.server";
import { useSession as createCookieSession, setResponseHeader } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";
import { z } from "zod";
import { accountClient, accountsEnabled, googleProviderEnabled } from "./supabase.server";
import { ACCOUNT_PATHS, devotionalDecision } from "./accounts";
import { progressFrom, type Progress } from "./progression";

type AuthData = {
  sampleCode?: string | undefined;
  sampleError?: string | undefined;
  accessToken?: string;
  refreshToken?: string;
  oauthStorage?: Record<string, string> | undefined;
};
async function authSession() {
  if (!accountsEnabled()) throw new Error("Accounts are not enabled.");
  const password = serverEnv("PROGRESS_SESSION_SECRET");
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
  if (!serverEnv("PROGRESS_SESSION_SECRET") || serverEnv("PROGRESS_SESSION_SECRET")!.length < 32)
    return null;
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
  let invitationMessage: string | null = session.data.sampleError ?? null;
  if (session.data.sampleCode) {
    const redeemed = await client.rpc("redeem_devotional_sample", { p_code: session.data.sampleCode });
    if (redeemed.error) throw new Error("Could not redeem the sample invitation.");
    if (!["granted", "already_granted", "paid"].includes(redeemed.data))
      invitationMessage = "O código não liberou a amostra. Confira o convite recebido ou peça um novo código.";
    await session.update({ sampleCode: undefined, sampleError: invitationMessage ?? undefined });
  }
  // Link Kiwify purchases made with this confirmed email before the account existed.
  await client.rpc("claim_devotional_purchases");
  const { data, error } = await client
    .from("devotional_access")
    .select("access_status, access_started_at, expires_at, updated_at, sample_granted_at")
    .eq("user_id", checked.data.user.id)
    .maybeSingle();
  if (error) throw new Error("Could not verify product access.");
  const access = z
    .object({
      access_status: z.enum(["pending", "active", "expired", "cancelled"]),
      sample_granted_at: z.string().nullable().optional(),
      expires_at: z.string().nullable(),
      access_started_at: z.string().nullable(),
      updated_at: z.string(),
    })
    .nullable()
    .parse(data);
  return { user: checked.data.user, client, access, invitationMessage };
}

function requireAccessFor(account: Awaited<ReturnType<typeof currentAccount>>) {
  const decision = devotionalDecision(
    account?.user.id ?? null,
    account?.access?.access_status ?? null,
    account?.access?.expires_at ?? null,
    account?.access?.sample_granted_at,
  );
  if (decision === "login") throw redirect({ href: ACCOUNT_PATHS.login });
  if (decision === "denied") throw redirect({ href: ACCOUNT_PATHS.denied });
  return account!;
}

async function requireAccess() {
  return requireAccessFor(await currentAccount());
}

const persistedProgress = z.object({
  maxReadableDay: z.literal(1).optional(),
  completed: z.number().int().min(0).max(90),
  currentDay: z.number().int().min(1).max(90).nullable(),
  ownerId: z.string().uuid(),
  nextAvailableAt: z.string().datetime({ offset: true }).nullable(),
});
function checkedProgress(data: unknown, userId: string): Progress {
  const result = persistedProgress.parse(data);
  const canonical = progressFrom(result.completed, result.nextAvailableAt);
  if (result.ownerId !== userId || result.currentDay !== canonical.currentDay)
    throw new Error("Invalid account progress.");
  return { ...canonical, ownerId: userId, ...(result.maxReadableDay === 1 ? { maxReadableDay: 1 as const } : {}) };
}

export function accountProgress(publicView = false) {
  return {
    async read(): Promise<Progress> {
      const account = await currentAccount();
      if (publicView) {
        if (
          devotionalDecision(
            account?.user.id ?? null,
            account?.access?.access_status ?? null,
            account?.access?.expires_at ?? null,
    account?.access?.sample_granted_at,
          ) !== "allowed"
        )
          return { ...progressFrom(0), ownerId: account?.user.id ?? null };
      }
      const authorized = requireAccessFor(account);
      const { data, error } = await authorized.client.rpc("get_devotional_progress");
      if (error) throw new Error("Could not load account progress.");
      return checkedProgress(data, authorized.user.id);
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
    return {
      ok: false,
      message: authFailureMessage(error ?? {}, "Não foi possível entrar. Confira seus dados."),
    };
  await session.update({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  });
  return { ok: true };
}

export async function registerAccount(email: string, password: string, name?: string) {
  await authSession();
  const { data, error } = await accountClient().auth.signUp({
    email,
    password,
    options: { data: { full_name: name ?? null }, emailRedirectTo: accountRedirectUrl() },
  });
  if (error)
    return {
      ok: false,
      message: authFailureMessage(
        error,
        "Não foi possível cadastrar a conta. Tente novamente em alguns instantes.",
      ),
    };
  // Signing up never grants product access or bypasses email confirmation.
  return {
    ok: true,
    message: data.session
      ? "Conta criada. Entre com seu e-mail e senha. O acesso ao devocional depende de liberação."
      : "Confira seu e-mail e confirme a conta antes de entrar. Verifique também a pasta de spam. O cadastro não libera o devocional automaticamente.",
  };
}

export async function signOutAccount() {
  const session = await authSession();
  try {
    if (session.data.accessToken)
      await accountClient().auth.admin.signOut(session.data.accessToken, "local");
  } finally {
    await session.clear();
  }
  return { ok: true };
}

function accountRedirectUrl() {
  const url = new URL(serverEnv("DEVOCIONAL_SITE_URL") ?? "https://semprepositivo.lovable.app");
  if (
    url.protocol !== "https:" &&
    !(process.env["NODE_ENV"] !== "production" && url.hostname === "127.0.0.1")
  )
    throw new Error("Invalid account site URL");
  return new URL("/auth/retorno", url.origin).href;
}

export async function recoverAccount(email: string) {
  await authSession();
  const { error } = await accountClient().auth.resetPasswordForEmail(email, {
    redirectTo: accountRedirectUrl(),
  });
  if (
    error &&
    [
      "email_provider_disabled",
      "signup_disabled",
      "over_email_send_rate_limit",
      "over_request_rate_limit",
    ].includes(error.code ?? "")
  )
    return {
      ok: false,
      message: authFailureMessage(error, "Não foi possível enviar o link agora."),
    };
  return {
    ok: true,
    message: "Se houver uma conta para este e-mail, você receberá um link para redefinir a senha.",
  };
}

export async function acceptAccountSession(accessToken: string, refreshToken: string) {
  const session = await authSession();
  const client = accountClient();
  const result = await client.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (result.error || !result.data.session) return { ok: false };
  const checked = await client.auth.getUser(result.data.session.access_token);
  if (checked.error || !checked.data.user?.email_confirmed_at) return { ok: false };
  await session.update({
    accessToken: result.data.session.access_token,
    refreshToken: result.data.session.refresh_token,
  });
  return { ok: true };
}

export async function changeAccountPassword(password: string) {
  // Password recovery depends on verified Auth identity, not a product purchase
  // or profile read. Restore and verify one Auth client for the whole operation.
  const session = await authSession();
  if (!session.data.accessToken || !session.data.refreshToken)
    return { ok: false, message: "Solicite um novo link de recuperação e abra o e-mail mais recente." };
  const client = accountClient();
  const loaded = await client.auth.setSession({
    access_token: session.data.accessToken,
    refresh_token: session.data.refreshToken,
  });
  if (loaded.error || !loaded.data.session)
    return { ok: false, message: "O link ou a sessão de recuperação expirou. Solicite um novo link." };
  const checked = await client.auth.getUser(loaded.data.session.access_token);
  if (checked.error || !checked.data.user?.email_confirmed_at)
    return { ok: false, message: "Não foi possível confirmar sua conta. Solicite um novo link de recuperação." };
  // Persist rotated tokens even if the provider rejects the chosen password.
  await session.update({
    accessToken: loaded.data.session.access_token,
    refreshToken: loaded.data.session.refresh_token,
  });
  const result = await client.auth.updateUser({ password });
  if (result.error) {
    // Safe diagnostics only: never log the password, user or session tokens.
    console.warn("password_update_rejected", { code: result.error.code ?? "unknown", status: result.error.status });
    return { ok: false, message: authFailureMessage(result.error, "Não foi possível salvar a nova senha agora. Tente novamente; se continuar, solicite um novo link de recuperação.") };
  }
  return { ok: true, message: "Senha atualizada. Você já pode entrar." };
}

function oauthClient(session: Awaited<ReturnType<typeof authSession>>) {
  const storage = { ...session.data.oauthStorage };
  return accountClient(undefined, {
    flowType: "pkce",
    persistSession: true,
    storage: {
      getItem: async (key) => storage[key] ?? null,
      setItem: async (key, value) => {
        // Persist only PKCE state in the encrypted HttpOnly cookie. Auth tokens
        // are saved explicitly after server-side verification below.
        if (!key.endsWith("code-verifier")) return;
        storage[key] = value;
        await session.update({ oauthStorage: { ...storage } });
      },
      removeItem: async (key) => {
        if (!key.endsWith("code-verifier")) return;
        delete storage[key];
        await session.update({ oauthStorage: { ...storage } });
      },
    },
  });
}

export async function beginGoogleAccount() {
  const enabled = await googleProviderEnabled();
  if (enabled !== true)
    return {
      ok: false,
      url: null,
      message:
        enabled === false
          ? "A entrada com Google ainda não foi configurada. Por enquanto, entre ou crie sua conta com e-mail e senha."
          : "Não foi possível verificar a entrada com Google agora. Use e-mail e senha ou tente novamente.",
    };
  const session = await authSession();
  const { data, error } = await oauthClient(session).auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: accountRedirectUrl(), skipBrowserRedirect: true },
  });
  if (error || !data.url)
    return {
      ok: false,
      url: null,
      message: "Não foi possível iniciar a entrada com Google. Tente novamente.",
    };
  return { ok: true, url: data.url, message: "" };
}

export async function finishGoogleAccount(code: string) {
  const session = await authSession();
  if (!session.data.oauthStorage || Object.keys(session.data.oauthStorage).length === 0)
    return { ok: false };
  const client = oauthClient(session);
  const { data, error } = await client.auth.exchangeCodeForSession(code);
  if (error || !data.session) return { ok: false };
  const checked = await client.auth.getUser(data.session.access_token);
  if (checked.error || !checked.data.user?.email_confirmed_at) return { ok: false };
  await session.update({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    oauthStorage: undefined,
  });
  // Auth may create the profile, but never activates product access.
  return { ok: true };
}

// Public landing UI loads this in the background. Product content still goes
// through requireAccess and the database's protected RPCs on every request.
export async function landingAccountState() {
  const account = await currentAccount();
  if (!account) return null;
  const allowed = devotionalDecision(account.user.id, account.access?.access_status ?? null, account.access?.expires_at ?? null, account.access?.sample_granted_at) === "allowed";
  let progress: Progress = { ...progressFrom(0), ownerId: account.user.id };
  if (allowed) {
    const { data, error } = await account.client.rpc("get_devotional_progress");
    if (error) throw new Error("Could not load account progress.");
    progress = checkedProgress(data, account.user.id);
  }
  return { userId: account.user.id, access: account.access, progress };
}

export async function stageSampleInvitation(code: string) {
  const session = await authSession();
  await session.update({ sampleCode: code.trim().toUpperCase() || undefined, sampleError: undefined });
  return { ok: true };
}
export async function redeemSampleInvitation(code: string) {
  const account = await currentAccount();
  if (!account) return { ok: false, message: "Entre na sua conta e confirme seu e-mail antes de usar o convite." };
  const { data, error } = await account.client.rpc("redeem_devotional_sample", { p_code: code.trim().toUpperCase() });
  if (error) return { ok: false, message: "Não foi possível verificar o convite agora. Tente novamente." };
  if (["granted", "already_granted", "paid"].includes(data)) return { ok: true, message: "Amostra liberada. Você já pode conhecer o Dia 1." };
  return { ok: false, message: data === "unavailable" ? "Este acesso não permite ativar uma amostra. Fale com o suporte." : "Código inválido, encerrado ou sem vagas. Confira o convite recebido." };
}
