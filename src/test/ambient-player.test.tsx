import { cleanup, fireEvent, render, screen, act } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi, type Mock } from "vitest";
import { AmbientPlayer } from "@/components/ambient-player";

let paused = true;
let play: Mock<() => Promise<void>>;
beforeEach(() => {
  localStorage.clear();
  paused = true;
  vi.useFakeTimers();
  vi.spyOn(HTMLMediaElement.prototype, "paused", "get").mockImplementation(() => paused);
  play = vi.fn(function (this: HTMLMediaElement) {
    paused = false;
    this.dispatchEvent(new Event("play"));
    return Promise.resolve();
  });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(play);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (this: HTMLMediaElement) {
    paused = true;
    this.dispatchEvent(new Event("pause"));
  });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

it("defers audio loading and starts softly without blocking render", async () => {
  const { container } = render(<AmbientPlayer />);
  const audio = container.querySelector("audio")!;
  expect(audio.getAttribute("src")).toBeNull();
  expect(audio.preload).toBe("none");
  expect(audio.volume).toBe(0.2);
  await act(async () => { vi.advanceTimersByTime(300); });
  expect(play).toHaveBeenCalledOnce();
  expect(audio.loop).toBe(true);
  expect(screen.getByRole("button", { name: "Pausar música" })).toBeInTheDocument();
});

it("remembers a deliberate pause across remounts and later interactions", async () => {
  const first = render(<AmbientPlayer />);
  await act(async () => { vi.advanceTimersByTime(300); });
  fireEvent.click(screen.getByRole("button", { name: "Pausar música" }));
  expect(localStorage.getItem("semprepositivo:ambient-paused")).toBe("true");
  first.unmount();
  play.mockClear();
  render(<AmbientPlayer />);
  await act(async () => { vi.advanceTimersByTime(300); fireEvent.pointerDown(document); });
  expect(play).not.toHaveBeenCalled();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Reproduzir música" })); });
  expect(play).toHaveBeenCalledOnce();
});

it("keeps play available after blocked autoplay and retries on interaction", async () => {
  play.mockRejectedValueOnce(new DOMException("Blocked", "NotAllowedError"));
  render(<AmbientPlayer />);
  await act(async () => { vi.advanceTimersByTime(300); });
  expect(screen.getByRole("button", { name: "Reproduzir música" })).toBeInTheDocument();
  await act(async () => { fireEvent.pointerDown(document); });
  expect(screen.getByRole("button", { name: "Pausar música" })).toBeInTheDocument();
});

it("restores volume and keeps the same audio while its parent rerenders", async () => {
  localStorage.setItem("semprepositivo:ambient-paused", "true");
  localStorage.setItem("semprepositivo:ambient-volume", "0.35");
  const { container, rerender } = render(<AmbientPlayer />);
  const audio = container.querySelector("audio")!;
  expect(audio.volume).toBe(0.35);
  fireEvent.change(screen.getByRole("slider"), { target: { value: "0.1" } });
  rerender(<AmbientPlayer />);
  expect(container.querySelector("audio")).toBe(audio);
  expect(audio.volume).toBe(0.1);
  expect(localStorage.getItem("semprepositivo:ambient-volume")).toBe("0.1");
});
