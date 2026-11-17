// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { campaignLabel, checkoutClickSchema, referrerOrigin } from "@/lib/checkout-click";
import { handleCheckoutClick } from "@/lib/checkout-click.server";

const event = { event_id: "10000000-0000-4000-8000-000000000001", cta_position: "hero", utm_source: "test-campaign" };
const request = (body: unknown, origin = "https://example.com") => new Request("https://example.com/api/public/checkout-click", {
  method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body),
});

describe("Minimal outgoing checkout measurement", () => {
  it("accepts hero and bottom only", () => {
    expect(checkoutClickSchema.parse(event).cta_position).toBe("hero");
    expect(checkoutClickSchema.parse({ ...event, cta_position: "bottom" }).cta_position).toBe("bottom");
    expect(checkoutClickSchema.safeParse({ ...event, cta_position: "other" }).success).toBe(false);
  });
  it("retains campaign labels and strips common personal value formats", () => {
    expect(campaignLabel("novembro-2026")).toBe("novembro-2026");
    for (const value of ["person@example.com", "+55 11 99999-9999", "11999999999", "https://example.com/?email=x", "x".repeat(161)]) expect(campaignLabel(value)).toBeNull();
  });
  it("stores only referrer origin, never credentials, query, path or IP", () => {
    expect(referrerOrigin("https://example.com/path?email=x#fragment")).toBe("https://example.com");
    expect(referrerOrigin("https://user:pass@example.com")).toBeNull();
    expect(referrerOrigin("http://127.0.0.1/a")).toBeNull();
  });
  it("rejects arbitrary identity fields and client timestamps", async () => {
    const save = vi.fn();
    expect((await handleCheckoutClick(request({ ...event, email: "x@example.com" }), save)).status).toBe(400);
    expect((await handleCheckoutClick(request({ ...event, clicked_at: "2026-01-01" }), save)).status).toBe(400);
    expect(save).not.toHaveBeenCalled();
  });
  it("rejects cross-origin and oversized requests before storage", async () => {
    const save = vi.fn();
    expect((await handleCheckoutClick(request(event, "https://other.example"), save)).status).toBe(403);
    expect((await handleCheckoutClick(request({ ...event, utm_term: "x".repeat(5000) }), save)).status).toBe(413);
    expect(save).not.toHaveBeenCalled();
  });
  it("sets a fixed server path and returns a graceful storage failure", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    expect((await handleCheckoutClick(request(event), save)).status).toBe(204);
    expect(save.mock.calls[0]?.[0]).toMatchObject({ path: "/acesso", cta_position: "hero" });
    expect((await handleCheckoutClick(request(event), async () => { throw new Error(); })).status).toBe(503);
  });
  it("denies direct anon/account access, timestamps server-side and deduplicates IDs, not repeated clicks", async () => {
    const db = new PGlite();
    try {
      await db.exec("create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon, authenticated, service_role;");
      await db.exec(await readFile("drizzle/migrations/0001_access_checkout_clicks.sql", "utf8"));
      for (const role of ["anon", "authenticated"]) {
        await db.exec(`set role ${role}`);
        await expect(db.query("select * from public.devotional_checkout_clicks")).rejects.toThrow();
        await expect(db.query("insert into public.devotional_checkout_clicks(event_id,cta_position) values($1,'hero')", [event.event_id])).rejects.toThrow();
        await db.exec("reset role");
      }
      await db.exec("set role service_role");
      const insert = "insert into public.devotional_checkout_clicks(event_id,cta_position) values($1,'hero') on conflict(event_id) do nothing";
      await db.query(insert, [event.event_id]);
      await db.query(insert, [event.event_id]);
      await db.query(insert, ["10000000-0000-4000-8000-000000000002"]);
      const result = await db.query<{ path: string; clicked_at: Date }>("select path,clicked_at from public.devotional_checkout_clicks");
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]?.path).toBe("/acesso");
      expect(result.rows[0]?.clicked_at).toBeInstanceOf(Date);
    } finally { await db.close(); }
  }, 30000);
});