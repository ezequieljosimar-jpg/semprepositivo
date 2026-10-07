import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/kiwify/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { serverEnv } = await import("@/lib/server-env.server");
        const { verifyKiwifySignature, parseKiwifyEvent } = await import("@/lib/kiwify.server");
        const token = serverEnv("KIWIFY_WEBHOOK_TOKEN");
        if (!token) return new Response("Not configured", { status: 503 });
        const raw = await request.text();
        if (raw.length > 100_000) return new Response("Too large", { status: 413 });
        const signature = new URL(request.url).searchParams.get("signature");
        if (!verifyKiwifySignature(raw, signature, token))
          return new Response("Invalid signature", { status: 401 });
        let body: unknown;
        try {
          body = JSON.parse(raw);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const event = parseKiwifyEvent(body);
        if (event.kind === "ignored") return Response.json({ ok: true, ignored: event.reason });

        const { createClient } = await import("@supabase/supabase-js");
        const url = serverEnv("SUPABASE_URL");
        const key = serverEnv("SUPABASE_SERVICE_ROLE_KEY");
        if (!url || !key) return new Response("Not configured", { status: 503 });
        const client = createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            fetch: (input, init) => {
              const h = new Headers(init?.headers);
              if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
                h.delete("Authorization");
              h.set("apikey", key);
              return fetch(input, { ...init, headers: h });
            },
          },
        });
        const { data, error } = await client.rpc("record_devotional_purchase_event", {
          p_provider: "kiwify",
          p_event_id: event.eventId,
          p_order_id: event.orderId,
          p_email: event.email,
          p_event_type: event.eventType,
          p_occurred_at: event.occurredAt,
        });
        if (error) {
          console.error("Kiwify webhook persistence failed", error.code, error.message);
          return new Response("Could not process", { status: 500 });
        }
        return Response.json({ ok: true, result: data });
      },
    },
  },
});
