// Real application HTTP/cookies; Auth is an isolated localhost fixture.
// No production accounts, email, purchases or credentials are used.
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import { runWithStartContext } from "@tanstack/start-storage-context";
import { serverFnFetcher } from "../node_modules/@tanstack/start-client-core/dist/esm/client-rpc/serverFnFetcher.js";
const base = "http://127.0.0.1:3014";
const secret = randomBytes(32).toString("hex");
const uid = "00000000-0000-4000-8000-000000000001";
let confirmed = false;
let registered = false;
let access = "pending";
let completed = 0;
let nextAvailableAt = null;
let server;
let cookie = "";
let ids;
const user = () => ({
  id: uid,
  email: "test@example.invalid",
  email_confirmed_at: confirmed ? "2026-01-01T00:00:00Z" : null,
  aud: "authenticated",
});
const fixture = createServer(async (req, res) => {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const input = raw ? JSON.parse(raw) : {};
  const url = new URL(req.url, "http://127.0.0.1");
  res.setHeader("Content-Type", "application/json");
  const reply = (data, status = 200) => {
    res.statusCode = status;
    res.end(JSON.stringify(data));
  };
  if (url.pathname.endsWith("/signup")) {
    registered = true;
    return reply({ user: user(), session: null });
  }
  if (url.pathname.endsWith("/token")) {
    if (!registered || !confirmed)
      return reply({ code: "email_not_confirmed", msg: "Email not confirmed" }, 400);
    return reply({
      access_token: "fixture-access",
      refresh_token: "fixture-refresh",
      expires_in: 3600,
      token_type: "bearer",
      user: user(),
    });
  }
  if (url.pathname.endsWith("/user")) return reply(user());
  if (url.pathname.endsWith("/logout")) return reply({});
  if (url.pathname.endsWith("/settings")) return reply({ external: { google: false } });
  if (url.pathname.endsWith("/devotional_access"))
    return reply({
      access_status: access,
      access_started_at: null,
      expires_at: null,
      updated_at: "2026-01-01T00:00:00Z",
    });
  if (url.pathname.endsWith("/devotional_profiles"))
    return reply({
      user_id: uid,
      name: "Teste isolado",
      email: "test@example.invalid",
      created_at: "2026-01-01",
      last_activity_at: null,
    });
  if (url.pathname.endsWith("/devotional_day_completions")) return reply([]);
  if (url.pathname.endsWith("/get_devotional_progress"))
    return reply({ completed, currentDay: completed + 1, nextAvailableAt, ownerId: uid });
  reply({ error: "Unexpected fixture request" }, 500);
});
await new Promise((resolve) => fixture.listen(3015, "127.0.0.1", resolve));
async function start() {
  server = spawn(
    process.execPath,
    ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "3014", "--strictPort"],
    {
      env: {
        ...process.env,
        PROGRESS_SESSION_SECRET: secret,
        DEVOCIONAL_ACCESS_MODE: "accounts",
        SUPABASE_URL: "http://127.0.0.1:3015",
        SUPABASE_PUBLISHABLE_KEY: "isolated-fixture-public-key",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("startup timeout")), 15000);
    server.stdout.on("data", (data) => {
      if (data.toString().includes("Local:")) {
        clearTimeout(timeout);
        resolve();
      }
    });
    server.stderr.on("data", () => {});
    server.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Server exited ${code}`));
    });
  });
}
async function stop() {
  if (server && server.exitCode === null)
    await new Promise((resolve) => {
      server.once("exit", resolve);
      server.kill();
    });
}
async function transport(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("origin", base);
  headers.set("sec-fetch-site", "same-origin");
  if (cookie) headers.set("cookie", cookie);
  const response = await fetch(new URL(path, base), { ...init, headers });
  const next = response.headers
    .getSetCookie()
    .find((value) => value.startsWith("sempre-positivo-account="));
  if (next) {
    assert.ok(next.includes("HttpOnly"));
    assert.match(next, /(Max-Age|Expires)=/i);
    cookie = next.split(";")[0];
  }
  return response;
}
async function rpc(name, data, method = "POST") {
  const value = await runWithStartContext({ startOptions: {} }, () =>
    serverFnFetcher(`/_serverFn/${ids[name]}`, [{ data, method }], transport),
  );
  if (value.error) throw value.error;
  return value.result;
}
try {
  await start();
  const source = await (await fetch(`${base}/src/lib/account-actions.ts`)).text();
  ids = Object.fromEntries(
    [...source.matchAll(/export const (\w+) = .*?createClientRpc\("([^"]+)"\)/g)].map((m) => [
      m[1],
      m[2],
    ]),
  );
  assert.equal(await rpc("getMyAccount", undefined, "GET"), null);
  assert.equal(
    (
      await rpc("signUp", {
        email: "test@example.invalid",
        password: "isolated-password",
        name: "Teste isolado",
      })
    ).ok,
    true,
  );
  assert.equal(registered, true);
  assert.equal(
    (await rpc("signIn", { email: "test@example.invalid", password: "isolated-password" })).ok,
    false,
  );
  confirmed = true; // Test fixture only. Production confirmation stays mandatory.
  assert.equal(
    (await rpc("signIn", { email: "test@example.invalid", password: "isolated-password" })).ok,
    true,
  );
  const savedCookie = cookie;
  assert.ok(!savedCookie.includes("fixture-access"));
  assert.equal((await rpc("getMyAccount", undefined, "GET")).access.access_status, "pending");
  const pendingHome = await (await transport("/")).text();
  assert.equal(pendingHome.includes("Quero acessar o devocional"), true);
  assert.equal(pendingHome.includes("Começar o Dia 01"), false);
  assert.equal((await (await transport("/dia/30")).text()).includes("Seu acesso ainda"), true);
  assert.equal((await rpc("beginGoogleSignIn")).ok, false);
  assert.equal((await rpc("getMyAccount", undefined, "GET")).profile.user_id, uid); // Refresh
  await stop();
  await start(); // Same browser cookie; new application process
  assert.equal((await rpc("getMyAccount", undefined, "GET")).profile.user_id, uid);
  access = "active";
  const activeHome = await (await transport("/")).text();
  assert.equal(activeHome.includes("Começar o Dia 01"), true);
  assert.equal(activeHome.includes("Quero acessar o devocional"), false);
  assert.equal((await (await transport("/dia/1")).text()).includes("Concluir este dia"), true);
  assert.equal((await (await transport("/dia/30")).text()).includes("Ainda não"), true);
  completed = 1;
  nextAvailableAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
  assert.equal((await (await transport("/dia/1")).text()).includes("Dia concluído"), true);
  const waiting = await (await transport("/dia/2?nextAvailableAt=2000-01-01&completed=90")).text();
  assert.equal(waiting.includes("Dia bloqueado"), true);
  assert.equal(waiting.includes("Concluir este dia"), false);
  await stop();
  await start();
  assert.equal((await (await transport("/dia/2")).text()).includes("Dia bloqueado"), true);
  nextAvailableAt = new Date(Date.now() - 1000).toISOString(); // Isolated backend fixture clock only
  assert.equal((await (await transport("/dia/2")).text()).includes("Concluir este dia"), true);
  assert.equal((await rpc("signOut")).ok, true);
  assert.equal(await rpc("getMyAccount", undefined, "GET"), null);
  assert.equal(
    (await rpc("signIn", { email: "test@example.invalid", password: "isolated-password" })).ok,
    true,
  );
  assert.equal((await rpc("getMyAccount", undefined, "GET")).profile.user_id, uid);
  console.log(
    "PASS: signup, mandatory confirmation, login, encrypted persistent HttpOnly cookie, refresh, process restart, pending denial, active access, future-day denial, disabled Google, logout and re-login (isolated Auth fixture).",
  );
} finally {
  await stop();
  await new Promise((resolve) => fixture.close(resolve));
}
