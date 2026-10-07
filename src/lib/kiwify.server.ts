import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

export const KIWIFY_PRODUCT_ID = "470d5e10-c1f6-11f1-8797-b571c21c2b82";

// Kiwify signs each sale webhook with the webhook token: ?signature=HMAC-SHA1(token, raw body) in hex.
export function verifyKiwifySignature(rawBody: string, signature: string | null, token: string) {
  if (!signature || !token) return false;
  const expected = createHmac("sha1", token).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(signature.toLowerCase());
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const payload = z.object({
  order_id: z.string().min(1).max(200),
  order_status: z.string().max(50).optional(),
  webhook_event_type: z.string().max(50),
  approved_date: z.string().nullish(),
  refunded_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  created_at: z.string().nullish(),
  Product: z.object({ product_id: z.string() }).passthrough(),
  Customer: z.object({ email: z.string().email().max(254) }).passthrough(),
}).passthrough();

const EVENT_MAP: Record<string, "purchase.approved" | "purchase.refunded" | "purchase.chargeback"> = {
  order_approved: "purchase.approved",
  order_refunded: "purchase.refunded",
  chargeback: "purchase.chargeback",
};

// Kiwify dates come as "YYYY-MM-DD HH:mm" (Brasília time) or ISO.
function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const v = value.trim();
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(:\d{2})?$/.exec(v);
  const d = m ? new Date(`${m[1]}T${m[2]}${m[3] ?? ":00"}-03:00`) : new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}

export type KiwifyParsed =
  | { kind: "ignored"; reason: string }
  | { kind: "event"; orderId: string; email: string; eventType: string; eventId: string; occurredAt: string };

export function parseKiwifyEvent(body: unknown, now = new Date()): KiwifyParsed {
  const parsed = payload.safeParse(body);
  if (!parsed.success) return { kind: "ignored", reason: "unrecognized payload" };
  const p = parsed.data;
  if (p.Product.product_id !== KIWIFY_PRODUCT_ID) return { kind: "ignored", reason: "other product" };
  const eventType = EVENT_MAP[p.webhook_event_type];
  if (!eventType) return { kind: "ignored", reason: "event not handled" };
  const date =
    eventType === "purchase.approved"
      ? parseDate(p.approved_date) ?? parseDate(p.updated_at)
      : parseDate(p.refunded_at) ?? parseDate(p.updated_at);
  return {
    kind: "event",
    orderId: p.order_id,
    email: p.Customer.email.trim().toLowerCase(),
    eventType,
    // Kiwify sends no event id: one event per order and type makes retries idempotent.
    eventId: `${p.order_id}:${p.webhook_event_type}`,
    occurredAt: (date ?? now).toISOString(),
  };
}
