import { afterEach, expect, it, vi } from "vitest";
import { recordCheckoutClick } from "@/lib/checkout-click";

afterEach(() => { vi.unstubAllGlobals(); window.history.replaceState({}, "", "/"); });

it("dispatches once per activation without waiting, preserving real repeated clicks", () => {
  window.history.replaceState({}, "", "/acesso?utm_source=campaign&utm_campaign=novembro&email=ignored");
  const send = vi.fn().mockReturnValue(new Promise(() => {}));
  let id = 0;
  vi.stubGlobal("fetch", send);
  vi.stubGlobal("crypto", { randomUUID: () => `10000000-0000-4000-8000-${String(++id).padStart(12, "0")}` });
  expect(recordCheckoutClick("hero")).toBeUndefined();
  expect(recordCheckoutClick("hero")).toBeUndefined();
  expect(send).toHaveBeenCalledTimes(2);
  const first = JSON.parse(send.mock.calls[0]?.[1].body);
  const second = JSON.parse(send.mock.calls[1]?.[1].body);
  expect(first.utm_source).toBe("campaign");
  expect(first).not.toHaveProperty("email");
  expect(first.event_id).not.toBe(second.event_id);
  expect(send.mock.calls[0]?.[1]).toMatchObject({ keepalive: true, credentials: "omit", referrerPolicy: "no-referrer" });
});

it("never throws when measurement fails", async () => {
  vi.stubGlobal("crypto", { randomUUID: () => "10000000-0000-4000-8000-000000000001" });
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  expect(() => recordCheckoutClick("bottom")).not.toThrow();
  await Promise.resolve();
  vi.stubGlobal("fetch", () => { throw new Error("unavailable"); });
  expect(() => recordCheckoutClick("bottom")).not.toThrow();
});