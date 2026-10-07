import { createFileRoute } from "@tanstack/react-router";

// Structured receipt log: never includes token, signature, e-mail or raw body.
function log(stage: string, info: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ kiwify_webhook: stage, ...info }));
}

export const Route = createFileRoute("/api/public/kiwify/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { serverEnv } = await import("@/lib/server-env.server");
        const { verifyKiwifySignature, parseKiwifyEvent } = await import("@/lib/kiwify.server");
        const hasSignature = new URL(request.url).searchParams.has("signature");
        log("received", { has_signature: hasSignature });
        const token = serverEnv("KIWIFY_WEBHOOK_TOKEN");
        if (!token) {
          log("rejected", { status: 503, reason: "token not configured" });
          return new Response("Not configured", { status: 503 });
        }
        const raw = await request.text();
        if (raw.length > 100_000) {
          log("rejected", { status: 413, reason: "body too large" });
          return new Response("Too large", { status: 413 });
        }
        const signature = new URL(request.url).searchParams.get("signature");
        if (!verifyKiwifySignature(raw, signature, token)) {
          log("rejected", { status: 401, reason: hasSignature ? "signature mismatch" : "signature missing" });
          return new Response("Invalid signature", { status: 401 });
        }
        log("authenticated");
        let body: unknown;
        try {
          body = JSON.parse(raw);
        } catch {
          log("rejected", { status: 400, reason: "invalid json" });
          return new Response("Invalid JSON", { status: 400 });
        }
        const event = parseKiwifyEvent(body);
        if (event.kind === "ignored") {
          const b = body as { webhook_event_type?: unknown };
          log("ignored", {
            status: 200,
            reason: event.reason,
            event_type: typeof b?.webhook_event_type === "string" ? b.webhook_event_type.slice(0, 50) : null,
          });
          return Response.json({ ok: true, ignored: event.reason });
        }

        const { createClient } = await import("@supabase/supabase-js");
        const url = serverEnv("SUPABASE_URL");
        const key = serverEnv("SUPABASE_SERVICE_ROLE_KEY");
        if (!url || !key) {
          log("rejected", { status: 503, reason: "backend not configured" });
          return new Response("Not configured", { status: 503 });
        }
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
          log("failed", { status: 500, code: error.code });
          return new Response("Could not process", { status: 500 });
        }
        log("processed", { status: 200, event_type: event.eventType, result: data });
        return Response.json({ ok: true, result: data });
      },
    },
  },
});
