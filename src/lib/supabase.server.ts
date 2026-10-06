import { serverEnv } from "./server-env.server";
import { createClient } from "@supabase/supabase-js";

export function accountsEnabled() {
  const mode = serverEnv("DEVOCIONAL_ACCESS_MODE") ?? "accounts";
  if (mode !== "anonymous" && mode !== "accounts")
    throw new Error("Invalid DEVOCIONAL_ACCESS_MODE");
  return mode === "accounts";
}

type AuthOptions = NonNullable<Parameters<typeof createClient>[2]>["auth"];

export function accountClient(accessToken?: string, authOptions?: AuthOptions) {
  const url = serverEnv("SUPABASE_URL");
  const key = serverEnv("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) throw new Error("Configure Supabase before enabling accounts.");
  const parsed = new URL(url);
  if (
    parsed.protocol !== "https:" &&
    !(process.env["NODE_ENV"] !== "production" && parsed.hostname === "127.0.0.1")
  )
    throw new Error("Supabase requires HTTPS.");
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      ...authOptions,
    },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {},
  });
}

// Check the real Auth provider before offering an OAuth redirect. No credentials
// or provider secrets are returned to the browser.
export async function googleProviderEnabled(): Promise<boolean | null> {
  const url = serverEnv("SUPABASE_URL");
  const key = serverEnv("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) return null;
  try {
    const response = await fetch(new URL("/auth/v1/settings", url), {
      headers: { apikey: key },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const settings = await response.json();
    return settings.external?.google === true;
  } catch {
    return null;
  }
}
