import { z } from "zod";

export const campaignKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
export type CtaPosition = "hero" | "bottom";

// Campaign labels only: exclude URLs, email addresses, phone-like digit runs and control characters.
export function campaignLabel(value: string | null): string | null {
  if (!value) return null;
  const label = value.trim();
  return label.length > 0 && label.length <= 160 && /^[\p{L}\p{N} _~.\-]+$/u.test(label) && !/\d[\d .\-]{6,}\d/.test(label)
    ? label : null;
}

export function referrerOrigin(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.origin.length > 300) return null;
    // Do not store IP literals or single-label local hosts.
    if (!url.hostname.includes('.') || /^[\d.]+$/.test(url.hostname) || url.hostname.includes(':')) return null;
    return url.origin;
  } catch { return null; }
}

const labelSchema = z.string().max(160).nullable().optional().transform(value => campaignLabel(value ?? null));
export const checkoutClickSchema = z.object({
  event_id: z.string().uuid(),
  cta_position: z.enum(["hero", "bottom"]),
  utm_source: labelSchema,
  utm_medium: labelSchema,
  utm_campaign: labelSchema,
  utm_content: labelSchema,
  utm_term: labelSchema,
  referrer: z.string().max(300).nullable().optional().transform(value => referrerOrigin(value ?? null)),
}).strict();

export function recordCheckoutClick(position: CtaPosition): void {
  try {
    const query = new URLSearchParams(window.location.search);
    const attribution = Object.fromEntries(campaignKeys.map(key => [key, campaignLabel(query.get(key))]));
    // One ID per activation, no retries: repeated genuine clicks get different IDs.
    const body = JSON.stringify({ event_id: crypto.randomUUID(), cta_position: position, ...attribution, referrer: referrerOrigin(document.referrer) });
    void fetch("/api/public/checkout-click", {
      method: "POST", body, headers: { "Content-Type": "application/json" },
      keepalive: true, credentials: "omit", referrerPolicy: "no-referrer",
    }).catch(() => {});
  } catch {
    // Tracking must never prevent the anchor's normal checkout navigation.
  }
}