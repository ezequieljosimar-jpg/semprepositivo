import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { progressFrom } from "./progression";

const credentials = z
  .object({ email: z.string().email().max(254), password: z.string().min(8).max(128) })
  .strict();
export const signIn = createServerFn({ method: "POST" })
  .validator(credentials)
  .handler(async ({ data }) => {
    const { signInAccount } = await import("./account-session.server");
    return signInAccount(data.email, data.password);
  });
export const signUp = createServerFn({ method: "POST" })
  .validator(credentials.extend({ name: z.string().trim().min(1).max(120) }).strict())
  .handler(async ({ data }) => {
    const { registerAccount } = await import("./account-session.server");
    return registerAccount(data.email, data.password, data.name);
  });
export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const { signOutAccount } = await import("./account-session.server");
  return signOutAccount();
});
export const getMyAccount = createServerFn({ method: "GET" }).handler(async () => {
  const { accountsEnabled } = await import("./supabase.server");
  if (!accountsEnabled()) return null;
  const { currentAccount } = await import("./account-session.server");
  const account = await currentAccount();
  if (!account) return null;
  const { data, error } = await account.client
    .from("devotional_profiles")
    .select("user_id,name,email,created_at,last_activity_at")
    .eq("user_id", account.user.id)
    .single();
  if (error) throw new Error("Could not load your profile.");
  const { data: completions, error: completionError } = await account.client
    .from("devotional_day_completions")
    .select("day_number,completed_at")
    .eq("user_id", account.user.id)
    .order("day_number");
  if (completionError) throw new Error("Could not load your progress.");
  return {
    profile: data,
    access: account.access,
    progress: { ...progressFrom(completions.length), ownerId: account.user.id, completions },
  };
});

export const accountConfiguration = createServerFn({ method: "GET" }).handler(async () => {
  const { accountsEnabled } = await import("./supabase.server");
  const { serverEnv } = await import("./server-env.server");
  return {
    enabled: accountsEnabled() && (serverEnv("PROGRESS_SESSION_SECRET")?.length ?? 0) >= 32,
  };
});
export const recoverPassword = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().email().max(254) }).strict())
  .handler(async ({ data }) => {
    const { recoverAccount } = await import("./account-session.server");
    return recoverAccount(data.email);
  });
export const acceptSession = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        accessToken: z.string().min(1).max(8192),
        refreshToken: z.string().min(1).max(8192),
      })
      .strict(),
  )
  .handler(async ({ data }) => {
    const { acceptAccountSession } = await import("./account-session.server");
    return acceptAccountSession(data.accessToken, data.refreshToken);
  });
export const updatePassword = createServerFn({ method: "POST" })
  .validator(z.object({ password: z.string().min(8).max(128) }).strict())
  .handler(async ({ data }) => {
    const { changeAccountPassword } = await import("./account-session.server");
    return changeAccountPassword(data.password);
  });

export const beginGoogleSignIn = createServerFn({ method: "POST" }).handler(async () => {
  const { beginGoogleAccount } = await import("./account-session.server");
  return beginGoogleAccount();
});
export const finishGoogleSignIn = createServerFn({ method: "POST" })
  .validator(z.object({ code: z.string().min(1).max(4096) }).strict())
  .handler(async ({ data }) => {
    const { finishGoogleAccount } = await import("./account-session.server");
    return finishGoogleAccount(data.code);
  });

export const googleSignInAvailable = createServerFn({ method: "GET" }).handler(async () => {
  const { googleProviderEnabled } = await import("./supabase.server");
  return { enabled: await googleProviderEnabled() === true };
});

export const getLandingAccount = createServerFn({ method: "GET" }).handler(async () => {
  const { accountsEnabled } = await import("./supabase.server");
  if (!accountsEnabled()) return null;
  const { landingAccountState } = await import("./account-session.server");
  return landingAccountState();
});
