import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import { runWithStartContext } from "@tanstack/start-storage-context";
import { serverFnFetcher } from "../node_modules/@tanstack/start-client-core/dist/esm/client-rpc/serverFnFetcher.js";

const base = "http://127.0.0.1:3012";
const secret = randomBytes(32).toString("hex");
let server;
let cookie = "";
async function start(mode = "anonymous") {
  server = spawn(
    process.execPath,
    ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "3012", "--strictPort"],
    {
      env: { ...process.env, PROGRESS_SESSION_SECRET: secret, DEVOCIONAL_ACCESS_MODE: mode },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Server startup timeout")), 15000);
    server.stdout.on("data", (data) => {
      if (data.toString().includes("Local:")) {
        clearTimeout(timer);
        resolve();
      }
    });
    server.stderr.on("data", () => {});
    server.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Server exited ${code}`));
    });
  });
}
async function stop() {
  if (!server || server.exitCode !== null) return;
  await new Promise((resolve) => {
    server.once("exit", resolve);
    server.kill();
  });
}
async function transport(url, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("origin", base);
  headers.set("sec-fetch-site", "same-origin");
  if (cookie) headers.set("cookie", cookie);
  const response = await fetch(new URL(url, base), { ...init, headers });
  const next = response.headers
    .getSetCookie()
    .find((c) => c.startsWith("sempre-positivo-progress="));
  if (next) cookie = next.split(";")[0];
  return response;
}
let ids;
async function rpc(name, data) {
  const value = await runWithStartContext({ startOptions: {} }, () =>
    serverFnFetcher(
      `/_serverFn/${ids[name]}`,
      [{ data, method: name === "completeDay" ? "POST" : "GET" }],
      transport,
    ),
  );
  if (value.error) throw value.error;
  return value.result;
}
try {
  await start();
  const source = await (await fetch(`${base}/src/lib/journey.ts`)).text();
  ids = Object.fromEntries(
    [...source.matchAll(/export const (\w+) = .*?createClientRpc\("([^"]+)"\)/g)].map((m) => [
      m[1],
      m[2],
    ]),
  );
  assert.equal(Object.keys(ids).length, 4);
  assert.deepEqual(await rpc("getProgress"), { completed: 0, currentDay: 1 });
  assert.equal((await rpc("readDay", 1)).day.n, 1);
  for (let n = 2; n <= 90; n++) assert.equal((await rpc("readDay", n)).day, null);
  console.log("1. New visitor: only day one is available; server denies all future content.");
  const saved = await rpc("completeDay", 1);
  assert.equal(saved.completed, 1);
  assert.ok(saved.nextAvailableAt);
  assert.equal((await rpc("readDay", 2)).day, null);
  await assert.rejects(rpc("completeDay", 2));
  await assert.rejects(rpc("completeDay", 3));
  assert.equal((await rpc("readDay", 1)).day.n, 1);
  assert.deepEqual(await rpc("completeDay", 1), saved);
  console.log("2. Next day stays locked; repeat completion preserves original release time.");
  for (let i = 0; i < 2; i++) {
    const r = await transport("/dia/2");
    assert.ok((await r.text()).includes("Dia bloqueado"));
    assert.deepEqual(await rpc("getProgress"), saved);
  }
  await stop();
  await start();
  assert.deepEqual(await rpc("getProgress"), saved);
  console.log("3. Refresh and process restart preserve the twelve-hour wait.");
  const blocked = await transport("/dia/30");
  const html = await blocked.text();
  assert.ok(html.includes("Dia bloqueado"));
  assert.ok(!html.includes("Concluir este dia"));
  assert.equal(blocked.headers.get("cache-control"), "private, no-store");
  assert.equal((await rpc("readDay", 30)).day, null);
  assert.equal((await rpc("readClosing")).content, null);
  const goodCookie = cookie;
  cookie = "sempre-positivo-progress=tampered";
  assert.equal((await rpc("readDay", 30)).day, null);
  cookie = goodCookie;
  console.log("9. Direct URL, API calls and tampered cookies do not expose future content.");
  await stop();
  cookie = "";
  await start("accounts");
  for (const path of ["/dia/1", "/dia/30", "/encerramento"]) {
    const response = await fetch(base + path, { redirect: "manual" });
    assert.ok([302, 303, 307, 308].includes(response.status));
    assert.equal(new URL(response.headers.get("location"), base).pathname, "/login");
  }
  console.log("Accounts mode: direct reading URLs require login before any content is returned.");
} finally {
  await stop();
}
