// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { canRead, type Progress } from "@/lib/progression";

// These identities exist only in an isolated local test database, never in Auth
// or the deployed project. No checkout, payment API or production buyer is used.
const A = "00000000-0000-4000-8000-000000000001";
const B = "00000000-0000-4000-8000-000000000002";
let db: PGlite;
let directory: string;
async function asUser(id: string | null) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id ?? ""]);
  await db.exec(id ? "set role authenticated" : "set role anon");
}
async function progress(): Promise<Progress> {
  return (await db.query<{ value: Progress }>("select public.get_devotional_progress() as value"))
    .rows[0]!.value;
}
async function complete(n: number): Promise<Progress> {
  return (
    await db.query<{ value: Progress }>("select public.complete_devotional_day($1) as value", [n])
  ).rows[0]!.value;
}

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "devotional-db-test-"));
  db = new PGlite(directory);
  // Supabase supplies these Auth primitives in production.
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key, email text, created_at timestamptz default now(), raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    revoke create on schema public from public;
    grant usage on schema public, auth to anon, authenticated, service_role;
  `);
  await db.exec(
    await readFile("supabase/migrations/20261006023000_accounts_and_access.sql", "utf8"),
  );
  await db.query(
    "insert into auth.users(id,email) values($1,'test-a@example.invalid'),($2,'test-b@example.invalid')",
    [A, B],
  );
  await db.query(
    "update public.devotional_access set access_status = 'active', access_started_at = now() where user_id = $1",
    [A],
  );
}, 30000);
afterAll(async () => {
  await db?.close();
  if (directory) await rm(directory, { recursive: true, force: true });
});

describe("Account database authorization and persistence", () => {
  it("1. denies signed-out access to progress and completion", async () => {
    await asUser(null);
    await expect(progress()).rejects.toThrow();
    await expect(complete(1)).rejects.toThrow();
  });
  it("2. denies authenticated accounts without active product access", async () => {
    await asUser(B);
    expect(
      (
        await db.query<{ access_status: string }>(
          "select access_status from public.devotional_access",
        )
      ).rows[0]!.access_status,
    ).toBe("pending");
    await expect(progress()).rejects.toThrow("Product access required");
    await expect(complete(1)).rejects.toThrow();
  });
  it("3. allows an account with active access", async () => {
    await asUser(A);
    expect(await progress()).toMatchObject({ completed: 0, currentDay: 1, ownerId: A });
  });
  it("4. isolates another account's records with RLS", async () => {
    expect(
      (await db.query("select * from public.devotional_profiles where user_id = $1", [B])).rows,
    ).toEqual([]);
    expect(
      (await db.query("select * from public.devotional_day_completions where user_id = $1", [B]))
        .rows,
    ).toEqual([]);
    expect(
      (await db.query("select * from public.devotional_access where user_id = $1", [B])).rows,
    ).toEqual([]);
    expect(
      (
        await db.query(
          "update public.devotional_profiles set name='Changed' where user_id=$1 returning *",
          [B],
        )
      ).rows,
    ).toEqual([]);
  });
  it("5. prevents self-granting access and bypassing completion RPC", async () => {
    await expect(
      db.query("update public.devotional_access set access_status='active' where user_id=$1", [A]),
    ).rejects.toThrow();
    await expect(
      db.query("insert into public.devotional_day_completions(user_id,day_number) values($1,30)", [
        A,
      ]),
    ).rejects.toThrow();
    await expect(
      db.query(
        "select public.apply_devotional_payment_event('unconfigured','test','test',$1,'purchase.approved',now())",
        [A],
      ),
    ).rejects.toThrow();
    await expect(
      db.query("delete from public.devotional_day_completions where user_id=$1", [A]),
    ).rejects.toThrow();
  });
  it("6. starts a new authorized account at day one", async () => {
    expect(await progress()).toMatchObject({ completed: 0, currentDay: 1 });
  });
  it("7. records day one with a server timestamp and unlocks day two", async () => {
    expect(await complete(1)).toMatchObject({ completed: 1, currentDay: 2 });
    const rows = (
      await db.query<{ day_number: number; completed_at: Date }>(
        "select day_number, completed_at from public.devotional_day_completions",
      )
    ).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0]!.day_number).toBe(1);
    expect(rows[0]!.completed_at).toBeTruthy();
  });
  it("8. blocks day three and rejects forged day numbers", async () => {
    await expect(complete(3)).rejects.toThrow();
    await expect(complete(0)).rejects.toThrow();
    await expect(complete(91)).rejects.toThrow();
    expect(canRead(await progress(), 3)).toBe(false);
  });
  it("9. retains progress on repeated reads (refresh)", async () => {
    expect(await progress()).toMatchObject({ completed: 1, currentDay: 2 });
    expect(await progress()).toMatchObject({ completed: 1, currentDay: 2 });
  });
  it("10. retains progress across logout, login and database restart", async () => {
    await asUser(null);
    await expect(progress()).rejects.toThrow();
    await db.close();
    db = new PGlite(directory);
    await asUser(A);
    expect(await progress()).toMatchObject({ completed: 1, currentDay: 2 });
  }, 30000);
  it("11. keeps completions from long ago without a sequence reset", async () => {
    await db.exec("reset role");
    await db.query(
      "update public.devotional_day_completions set completed_at = now() - interval '1 year' where user_id=$1",
      [A],
    );
    await asUser(A);
    expect(await progress()).toMatchObject({ completed: 1, currentDay: 2 });
  });
  it("12. keeps future content authorization denied", async () => {
    expect(canRead(await progress(), 30)).toBe(false);
    await expect(complete(30)).rejects.toThrow();
  });
  it("13. keeps completed days available and independent between accounts", async () => {
    expect(await complete(1)).toMatchObject({ completed: 1, currentDay: 2 });
    expect(await complete(2)).toMatchObject({ completed: 2, currentDay: 3 });
    expect(canRead(await progress(), 1)).toBe(true);
    await db.exec("reset role");
    await db.query("update public.devotional_access set access_status='active' where user_id=$1", [
      B,
    ]);
    await asUser(B);
    expect(await progress()).toMatchObject({ completed: 0, currentDay: 1, ownerId: B });
    expect(await complete(1)).toMatchObject({ completed: 1, currentDay: 2 });
    await asUser(A);
    expect(await progress()).toMatchObject({ completed: 2, currentDay: 3 });
  });
  it("retains all completions when entitlement is revoked and later restored", async () => {
    await db.exec("reset role");
    await db.query(
      "update public.devotional_access set access_status='cancelled' where user_id=$1",
      [A],
    );
    await asUser(A);
    await expect(progress()).rejects.toThrow();
    await db.exec("reset role");
    await db.query("update public.devotional_access set access_status='active' where user_id=$1", [
      A,
    ]);
    await asUser(A);
    expect(await progress()).toMatchObject({ completed: 2, currentDay: 3 });
  });
  it("validates internal event transactions using isolated fixtures, without any payment platform", async () => {
    await db.exec("reset role; set role service_role");
    const apply = async (event: string, order: string, type: string, date: string, user = A) =>
      (
        await db.query<{ value: boolean }>(
          "select public.apply_devotional_payment_event('isolated-test-provider',$1,$2,$3,$4,$5::timestamptz) as value",
          [event, order, user, type, date],
        )
      ).rows[0]!.value;
    expect(
      await apply("fixture-1", "fixture-order-1", "purchase.approved", "2026-01-01T00:00:00Z"),
    ).toBe(true);
    expect(
      await apply("fixture-1", "fixture-order-1", "purchase.approved", "2026-01-01T00:00:00Z"),
    ).toBe(false);
    await apply("fixture-2", "fixture-order-2", "payment.approved", "2026-01-02T00:00:00Z");
    await apply("fixture-3", "fixture-order-1", "purchase.refunded", "2026-01-03T00:00:00Z");
    expect(
      (
        await db.query<{ access_status: string }>(
          "select access_status from public.devotional_access where user_id=$1",
          [A],
        )
      ).rows[0]!.access_status,
    ).toBe("active");
    await apply("fixture-4", "fixture-order-1", "purchase.approved", "2025-12-01T00:00:00Z");
    expect(
      (
        await db.query<{ access_status: string }>(
          "select access_status from public.devotional_payment_orders where order_id='fixture-order-1'",
        )
      ).rows[0]!.access_status,
    ).toBe("cancelled");
    await expect(
      apply("fixture-5", "fixture-order-1", "purchase.approved", "2026-01-04T00:00:00Z", B),
    ).rejects.toThrow("another account");
    await apply("fixture-6", "fixture-order-2", "purchase.chargeback", "2026-01-05T00:00:00Z");
    expect(
      (
        await db.query<{ access_status: string }>(
          "select access_status from public.devotional_access where user_id=$1",
          [A],
        )
      ).rows[0]!.access_status,
    ).toBe("cancelled");
    expect(
      (await db.query("select * from public.devotional_day_completions where user_id=$1", [A]))
        .rows,
    ).toHaveLength(2);
  });
});
