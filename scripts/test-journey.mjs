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
  assert.deepEqual(await rpc("completeDay", 1), { completed: 1, currentDay: 2 });
  assert.equal((await rpc("readDay", 2)).day.n, 2);
  console.log("2. Completing day one unlocks day two.");
  assert.equal((await rpc("readDay", 3)).day, null);
  await assert.rejects(rpc("completeDay", 3));
  console.log("3. Day three cannot be read or completed early.");
  assert.equal((await rpc("readDay", 1)).day.n, 1);
  assert.equal((await rpc("completeDay", 1)).completed, 1);
  console.log("4. Previous days remain accessible; repeat completion is idempotent.");
  for (let i = 0; i < 2; i++) {
    const r = await transport("/dia/2");
    assert.equal(r.status, 200);
    assert.ok((await r.text()).includes("Concluir este dia"));
    assert.equal((await rpc("getProgress")).completed, 1);
  }
  console.log("5–6. Refresh and returning with the persistent cookie retain progress.");
  await stop();
  await start();
  assert.deepEqual(await rpc("getProgress"), { completed: 1, currentDay: 2 });
  console.log("7. Server restart retains progress; progression has no calendar dependency.");
  assert.equal((await rpc("completeDay", 2)).currentDay, 3);
  assert.equal((await rpc("readDay", 3)).day.n, 3);
  console.log("8. Completing day two unlocks day three.");
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
  for (let n = 3; n <= 90; n++) await rpc("completeDay", n);
  assert.deepEqual(await rpc("getProgress"), { completed: 90, currentDay: null });
  assert.ok((await rpc("readClosing")).content.length > 0);
  assert.equal((await rpc("readDay", 1)).day.n, 1);
  console.log("10. Day 90 completes the journey and opens the closing page.");
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
