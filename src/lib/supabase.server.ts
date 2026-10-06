import { createClient } from "@supabase/supabase-js";

export function accountsEnabled() {
  const mode = process.env["DEVOCIONAL_ACCESS_MODE"] ?? "accounts";
  if (mode !== "anonymous" && mode !== "accounts")
    throw new Error("Invalid DEVOCIONAL_ACCESS_MODE");
  return mode === "accounts";
}

export function accountClient(accessToken?: string) {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Configure Supabase before enabling accounts.");
  const parsed = new URL(url);
  if (
    parsed.protocol !== "https:" &&
    !(process.env["NODE_ENV"] !== "production" && parsed.hostname === "127.0.0.1")
  )
    throw new Error("Supabase requires HTTPS.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {},
  });
}
