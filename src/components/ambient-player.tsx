import { useEffect, useRef, useState } from "react";
import { Music2, Pause, Play } from "lucide-react";

const preferenceKey = "semprepositivo:ambient-paused";
const volumeKey = "semprepositivo:ambient-volume";

export function AmbientPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const manuallyPaused = useRef(false);
  const attempting = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.2);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      manuallyPaused.current = localStorage.getItem(preferenceKey) === "true";
      const savedVolume = localStorage.getItem(volumeKey);
      const value = savedVolume === null ? 0.2 : Number(savedVolume);
      if (Number.isFinite(value) && value >= 0 && value <= 1) {
        audio.volume = value;
        setVolume(value);
      }
    } catch { audio.volume = 0.2; }

    let disposed = false;
    const start = () => {
      if (manuallyPaused.current || !audio.paused || attempting.current) return;
      attempting.current = true;
      // Delay assigning the URL until after hydration; audio never blocks HTML.
      if (!audio.getAttribute("src")) audio.src = "/audio/reflexao.mp3";
      void audio.play().then(() => {
        if (disposed) audio.pause();
      }).catch(() => {
        // Autoplay restrictions leave a truthful, usable Play control.
      }).finally(() => { attempting.current = false; });
    };
    const timer = window.setTimeout(start, 300);
    document.addEventListener("pointerdown", start);
    document.addEventListener("keydown", start);
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", start);
      document.removeEventListener("keydown", start);
      audio.pause();
    };
  }, []);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      manuallyPaused.current = true;
      audio.pause();
      try { localStorage.setItem(preferenceKey, "true"); } catch {}
      return;
    }
    manuallyPaused.current = false;
    try { localStorage.setItem(preferenceKey, "false"); } catch {}
    setFailed(false);
    if (!audio.getAttribute("src")) audio.src = "/audio/reflexao.mp3";
    try { await audio.play(); } catch { setFailed(true); }
  }

  return (
    <aside aria-label="Música de reflexão" className="fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border border-white/15 bg-[#191715]/95 px-3 py-2 text-[#f2e8d5] shadow-lg backdrop-blur">
      <audio ref={audioRef} loop preload="none" onPlay={() => { setPlaying(true); setFailed(false); }} onPause={() => setPlaying(false)} onError={() => { setPlaying(false); setFailed(true); }} />
      <Music2 aria-hidden="true" className="h-4 w-4 opacity-70" />
      <div className="text-xs">
        <p>Música de reflexão</p>
        <p aria-live="polite" className="text-[10px] opacity-65">{failed ? "Toque para tentar novamente" : playing ? "Tocando" : "Pausada"}</p>
      </div>
      <button type="button" onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} onClick={() => void toggle()} aria-label={playing ? "Pausar música" : "Reproduzir música"} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
        {playing ? <Pause aria-hidden="true" className="h-4 w-4" /> : <Play aria-hidden="true" className="h-4 w-4" />}
      </button>
      <input type="range" aria-label="Volume da música" min="0" max="1" step="0.01" value={volume} className="w-16 accent-[#c3a879]" onChange={(event) => {
        const next = Number(event.target.value);
        setVolume(next);
        if (audioRef.current) audioRef.current.volume = next;
        try { localStorage.setItem(volumeKey, String(next)); } catch {}
      }} />
    </aside>
  );
}
