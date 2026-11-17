import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/checkout-click")({
  server: { handlers: { POST: async ({ request }) => {
    const { handleCheckoutClick } = await import("@/lib/checkout-click.server");
    return handleCheckoutClick(request, async row => {
      // Same request-scoped credential pattern as the existing Kiwify endpoint.
      const { serverEnv } = await import("@/lib/server-env.server");
      const { createClient } = await import("@supabase/supabase-js");
      const url = serverEnv("SUPABASE_URL");
      const key = serverEnv("SUPABASE_SERVICE_ROLE_KEY");
      if (!url || !key) throw new Error("Click storage unavailable");
      const client = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        } },
      });
      const { error } = await client.from("devotional_checkout_clicks").upsert(row, { onConflict: "event_id", ignoreDuplicates: true });
      if (error) throw new Error("Click storage unavailable");
    });
  } } },
});