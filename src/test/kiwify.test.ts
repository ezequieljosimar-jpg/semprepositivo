import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { verifyKiwifySignature, parseKiwifyEvent, KIWIFY_PRODUCT_ID } from "@/lib/kiwify.server";

const base = (ev: string, product = KIWIFY_PRODUCT_ID) => ({
  order_id: "o1",
  webhook_event_type: ev,
  approved_date: "2026-10-07 00:00",
  Product: { product_id: product },
  Customer: { email: "A@Example.com" },
});

describe("Kiwify webhook", () => {
  it("verifies HMAC-SHA1 signature of the raw body", () => {
    const body = JSON.stringify(base("order_approved"));
    const sig = createHmac("sha1", "tok").update(body).digest("hex");
    expect(verifyKiwifySignature(body, sig, "tok")).toBe(true);
    expect(verifyKiwifySignature(body, sig, "other")).toBe(false);
    expect(verifyKiwifySignature(body, null, "tok")).toBe(false);
  });
  it("maps handled events for the product only", () => {
    const e = parseKiwifyEvent(base("order_approved"));
    expect(e).toMatchObject({ kind: "event", eventType: "purchase.approved", email: "a@example.com", eventId: "o1:order_approved", occurredAt: "2026-10-07T03:00:00.000Z" });
    expect(parseKiwifyEvent(base("order_refunded"))).toMatchObject({ eventType: "purchase.refunded" });
    expect(parseKiwifyEvent(base("chargeback"))).toMatchObject({ eventType: "purchase.chargeback" });
    expect(parseKiwifyEvent(base("order_approved", "x"))).toMatchObject({ kind: "ignored" });
    expect(parseKiwifyEvent(base("pix_created"))).toMatchObject({ kind: "ignored" });
  });
  it("ignores the official Kiwify test payload (fictitious product)", () => {
    const test = { ...base("order_approved", "321c9121-3dca-4996-b363-8e59af6d9088"), Customer: { email: "johndoe@example.com" } };
    expect(parseKiwifyEvent(test)).toEqual({ kind: "ignored", reason: "other product" });
  });
});
