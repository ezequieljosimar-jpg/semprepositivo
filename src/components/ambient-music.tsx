import { useEffect, useRef, useState } from "react";
import { Music2, Pause, Play, SlidersHorizontal } from "lucide-react";

const SOURCE = "/audio/peaceful-prayer.mp3";
const PREFERENCE = "sempre-positivo-music";
type Preference = { paused: boolean; volume: number };
type Status = "preparing" | "playing" | "paused" | "blocked" | "error";

export function AmbientMusic() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const preference = useRef<Preference>({ paused: false, volume: 0.18 });
  const [status, setStatus] = useState<Status>("preparing");
  const [volume, setVolume] = useState(18);
  const [expanded, setExpanded] = useState(false);

  function save() {
    // Only music preferences live here; product authorization stays server-side.
    try { localStorage.setItem(PREFERENCE, JSON.stringify(preference.current)); } catch { /* Optional preference storage. */ }
  }
  async function play() {
    const player = audio.current;
    if (!player) return;
    if (!player.getAttribute("src")) player.src = SOURCE;
    try {
      await player.play();
      if (audio.current !== player) return;
      preference.current.paused = false;
      setStatus("playing");
      save();
    } catch (error) {
      if (audio.current !== player) return;
      setStatus(error instanceof DOMException && error.name === "NotAllowedError" ? "blocked" : "error");
    }
  }

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(PREFERENCE) ?? "null");
      if (stored && typeof stored.paused === "boolean" && typeof stored.volume === "number" && Number.isFinite(stored.volume))
        preference.current = { paused: stored.paused, volume: Math.min(1, Math.max(0, stored.volume)) };
    } catch { /* Start with the soft default volume. */ }
    const player = new Audio();
    player.preload = "none";
    player.loop = true;
    player.volume = preference.current.volume;
    audio.current = player;
    setVolume(Math.round(player.volume * 100));
    const onPause = () => setStatus("paused");
    const onPlaying = () => setStatus("playing");
    const onError = () => setStatus("error");
    player.addEventListener("pause", onPause);
    player.addEventListener("playing", onPlaying);
    player.addEventListener("error", onError);
    // Start only after the initial render, separately from route/data loading.
    const timer = window.setTimeout(() => {
      if (preference.current.paused) setStatus("paused");
      else void play();
    }, 800);
    return () => {
      window.clearTimeout(timer);
      audio.current = null;
      player.removeEventListener("pause", onPause);
      player.removeEventListener("playing", onPlaying);
      player.removeEventListener("error", onError);
      player.pause();
      player.removeAttribute("src");
      player.load();
    };
  }, []);

  return (
    <aside aria-label="Música de fundo" className="fixed bottom-3 right-3 z-40 max-w-[calc(100vw-1.5rem)] border border-border bg-background/95 px-3 py-2 text-foreground shadow-md backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <Music2 size={15} className="text-ember" aria-hidden="true" />
        <button type="button" className="font-label flex items-center gap-2 text-xs uppercase tracking-wide" onClick={() => {
          if (status === "playing") {
            preference.current.paused = true;
            audio.current?.pause();
            setStatus("paused");
            save();
          } else void play();
        }}>
          {status === "playing" ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
          {status === "playing" ? "Pausar som" : status === "error" ? "Tentar som novamente" : "Ativar som"}
        </button>
        <button type="button" aria-label="Ajustar volume da música" aria-expanded={expanded} className="p-1 hover:text-ember" onClick={() => setExpanded(!expanded)}>
          <SlidersHorizontal size={15} aria-hidden="true" />
        </button>
      </div>
      {expanded && <div className="mt-3 border-t border-border pt-2">
        <label className="font-label flex items-center gap-3 text-xs">Volume
          <input aria-label="Volume da música" type="range" min={0} max={100} value={volume} className="w-24 accent-ember" onChange={(event) => {
            const next = Number(event.target.value);
            setVolume(next);
            preference.current.volume = next / 100;
            if (audio.current) audio.current.volume = next / 100;
            save();
          }} />
          <span>{volume}%</span>
        </label>
        <p className="mt-2 max-w-56 text-xs text-muted-foreground">Peaceful Prayer · Denis-Pavlov-Music / Pixabay</p>
      </div>}
      {status === "error" && <p role="status" className="mt-2 max-w-56 text-xs text-muted-foreground">Não foi possível carregar a música. A leitura continua disponível.</p>}
    </aside>
  );
}
