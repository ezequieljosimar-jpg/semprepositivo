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
  .validator(credentials.extend({ name: z.string().trim().max(120).optional() }).strict())
  .handler(async ({ data }) => {
    const { registerAccount } = await import("./account-session.server");
    return registerAccount(data.email, data.password, data.name);
  });
export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const { signOutAccount } = await import("./account-session.server");
  return signOutAccount();
});
export const getMyAccount = createServerFn({ method: "GET" }).handler(async () => {
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
