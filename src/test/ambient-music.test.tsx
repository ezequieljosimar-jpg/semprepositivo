import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AmbientMusic } from "@/components/ambient-music";
let player: FakeAudio;
class FakeAudio extends EventTarget {
  src = ""; volume = 1; loop = false; preload = "";
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn(); load = vi.fn();
  constructor() { super(); player = this; }
  getAttribute(name: string) { return name === "src" ? this.src || null : null; }
  removeAttribute(name: string) { if (name === "src") this.src = ""; }
}
beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); vi.stubGlobal("Audio", FakeAudio); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
it("does not fetch audio during initial render, then attempts low-volume autoplay", async () => {
  render(<AmbientMusic />);
  expect(player.src).toBe("");
  expect(player.preload).toBe("none");
  expect(player.play).not.toHaveBeenCalled();
  await act(async () => { vi.advanceTimersByTime(800); });
  expect(player.src).toBe("/audio/peaceful-prayer.mp3");
  expect(player.volume).toBe(0.18);
  expect(player.loop).toBe(true);
  expect(screen.getByRole("button", { name: "Pausar som" })).toBeTruthy();
});
it("offers manual playback when the browser blocks autoplay", async () => {
  render(<AmbientMusic />);
  player.play.mockRejectedValueOnce(new DOMException("Autoplay blocked", "NotAllowedError"));
  await act(async () => { vi.advanceTimersByTime(800); });
  expect(screen.getByRole("button", { name: "Ativar som" })).toBeTruthy();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Ativar som" })); });
  expect(screen.getByRole("button", { name: "Pausar som" })).toBeTruthy();
});
it("remembers a pause and volume without restarting audio on rerender", async () => {
  const view = render(<AmbientMusic />);
  await act(async () => { vi.advanceTimersByTime(800); });
  fireEvent.click(screen.getByRole("button", { name: "Ajustar volume da música" }));
  fireEvent.change(screen.getByRole("slider", { name: "Volume da música" }), { target: { value: "12" } });
  expect(player.volume).toBe(0.12);
  fireEvent.click(screen.getByRole("button", { name: "Pausar som" }));
  view.rerender(<AmbientMusic />);
  expect(player.play).toHaveBeenCalledTimes(1);
  view.unmount();
  render(<AmbientMusic />);
  await act(async () => { vi.advanceTimersByTime(800); });
  expect(player.play).not.toHaveBeenCalled();
  expect(player.volume).toBe(0.12);
  expect(player.src).toBe("");
});
it("keeps reading available and reports an unavailable audio file", async () => {
  render(<AmbientMusic />);
  player.play.mockRejectedValueOnce(new Error("File unavailable"));
  await act(async () => { vi.advanceTimersByTime(800); });
  expect(screen.getByRole("status").textContent).toContain("A leitura continua disponível");
});
