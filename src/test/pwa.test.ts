import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { appIcons } from "../lib/app-icons.server";
import { calendarReminder } from "../lib/calendar-reminder";

describe("installable devotional", () => {
  it("offers standalone installation with real icons", () => {
    const manifest = JSON.parse(readFileSync("public/manifest.webmanifest","utf8"));
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/devocional");
    for(const icon of manifest.icons) {
      const png = Buffer.from(appIcons[icon.src.split("/").pop()]!, "base64");
      expect(png.subarray(1,4).toString()).toBe("PNG");
      expect(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`).toBe(icon.sizes);
    }
    expect(manifest.icons.some((i: {purpose: string}) => i.purpose === "maskable")).toBe(true);
  });
  it("only caches the public offline notice", () => {
    const sw = readFileSync("public/devocional-sw.js","utf8");
    expect(sw.match(/cache\.add\(/g)).toHaveLength(1);
    expect(sw).toContain('cache.add("/offline.html")');
    expect(sw).not.toContain("cache.put(");
    expect(sw).toContain('request.mode !== "navigate"');
  });
});
describe("opt-in calendar reminder", () => {
  it("uses next local occurrence, remaining journey days and an alarm", () => {
    const now = new Date(2026,9,11,10,15,0);
    const ics = calendarReminder(7,0,80,"https://semprepositivo.lovable.app",now);
    expect(ics).toContain("DTSTART:20261012T070000\r\n");
    expect(ics).toContain("RRULE:FREQ=DAILY;COUNT=80");
    expect(ics).toContain("TRIGGER:PT0M");
    expect(ics).toContain("URL:https://semprepositivo.lovable.app/devocional");
    expect(ics.split("\r\n").every(line => new TextEncoder().encode(line).length <=75)).toBe(true);
  });
  it("starts today if the chosen time is still ahead", () => {
    expect(calendarReminder(20,30,90,"https://semprepositivo.lovable.app",new Date(2026,9,11,10))).toContain("DTSTART:20261011T203000");
  });
  it("rejects invalid time, duration and non-https origins", () => {
    expect(() => calendarReminder(24,0,90,"https://example.com")).toThrow();
    expect(() => calendarReminder(7,0,0,"https://example.com")).toThrow();
    expect(() => calendarReminder(7,0,90,"http://example.com")).toThrow();
  });
});
