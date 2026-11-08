import { useEffect, useRef, useState } from "react";
import { Music2, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const preferenceKey = "semprepositivo:ambient-paused";
const volumeKey = "semprepositivo:ambient-volume";
const trackKey = "semprepositivo:ambient-track";
const tracks = [
  { id: "reflexao", label: "Reflexão" },
  { id: "oracao", label: "Oração" },
  { id: "descanso", label: "Descanso" },
] as const;
type Track = typeof tracks[number]["id"];
function isTrack(value: string | null): value is Track {
  return tracks.some((track) => track.id === value);
}

export function AmbientPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const manuallyPaused = useRef(false);
  const attempting = useRef(false);
  const request = useRef(0);
  const selected = useRef<Track>("reflexao");
  const [track, setTrack] = useState<Track>("reflexao");
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.2);
  const [failed, setFailed] = useState(false);

  async function playAudio(audio: HTMLAudioElement) {
    const current = ++request.current;
    attempting.current = true;
    setFailed(false);
    if (!audio.getAttribute("src")) audio.src = `/audio/${selected.current}.mp3`;
    try { await audio.play(); }
    catch (error) {
      if (current === request.current && error instanceof Error && error.name !== "NotAllowedError") setFailed(true);
    } finally {
      if (current === request.current) attempting.current = false;
    }
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      manuallyPaused.current = localStorage.getItem(preferenceKey) === "true";
      const savedTrack = localStorage.getItem(trackKey);
      if (isTrack(savedTrack)) {
        selected.current = savedTrack;
        setTrack(savedTrack);
      }
      const savedVolume = localStorage.getItem(volumeKey);
      const value = savedVolume === null ? 0.2 : Number(savedVolume);
      if (Number.isFinite(value) && value >= 0 && value <= 1) {
        audio.volume = value;
        setVolume(value);
      }
    } catch { audio.volume = 0.2; }

    const start = (event?: Event) => {
      // Native document listeners can precede React's delegated handlers.
      // A play-button gesture must not also trigger the autoplay retry.
      if (event?.target instanceof Element && event.target.closest('[data-ambient-player]')) return;
      if (manuallyPaused.current || !audio.paused || attempting.current) return;
      // Delay assigning the URL until after hydration; audio never blocks HTML.
      void playAudio(audio);
    };
    const timer = window.setTimeout(start, 300);
    document.addEventListener("pointerdown", start);
    document.addEventListener("keydown", start);
    return () => {
      request.current += 1;
      attempting.current = false;
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
      request.current += 1;
      attempting.current = false;
      audio.pause();
      try { localStorage.setItem(preferenceKey, "true"); } catch {}
      return;
    }
    manuallyPaused.current = false;
    try { localStorage.setItem(preferenceKey, "false"); } catch {}
    await playAudio(audio);
  }

  function changeTrack(value: string) {
    const audio = audioRef.current;
    if (!audio || !isTrack(value) || value === selected.current) return;
    const resume = !manuallyPaused.current && (!audio.paused || attempting.current);
    request.current += 1;
    attempting.current = false;
    // One persistent audio element: stop the old source before loading the new.
    audio.pause();
    selected.current = value;
    setTrack(value);
    setFailed(false);
    try { localStorage.setItem(trackKey, value); } catch {}
    audio.src = `/audio/${value}.mp3`;
    audio.load();
    if (resume) void playAudio(audio);
  }

  return (
    <aside data-ambient-player aria-label="Música de reflexão" onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} className="fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-2xl border border-ink-foreground/15 bg-ink/95 px-3 py-2 text-ink-foreground shadow-lg backdrop-blur">
      <audio ref={audioRef} loop preload="none" onPlay={() => { setPlaying(true); setFailed(false); }} onPause={() => setPlaying(false)} onError={() => { setPlaying(false); setFailed(true); }} />
      <Music2 aria-hidden="true" className="h-4 w-4 shrink-0 opacity-70" />
      <div className="w-28 shrink-0 text-xs">
        <Select value={track} onValueChange={changeTrack}>
          <SelectTrigger aria-label="Faixa musical" className="h-7 border-0 px-0 text-xs shadow-none focus:ring-ink-foreground/40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" className="z-[60] border-ink-foreground/20 bg-ink text-ink-foreground">
            {tracks.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <p aria-live="polite" className="text-[10px] opacity-65">{failed ? "Toque para tentar novamente" : playing ? "Tocando" : "Pausada"}</p>
      </div>
      <Button type="button" variant="ghost" size="icon" onClick={() => void toggle()} aria-label={playing ? "Pausar música" : "Reproduzir música"} title={playing ? "Pausar música" : "Reproduzir música"} className="h-10 w-10 shrink-0 rounded-full border border-ink-foreground/20 hover:bg-ink-foreground/10 hover:text-ink-foreground">
        {playing ? <Pause aria-hidden="true" className="h-4 w-4" /> : <Play aria-hidden="true" className="h-4 w-4" />}
      </Button>
      <input type="range" aria-label="Volume da música" min="0" max="1" step="0.01" value={volume} className="w-16 min-w-0 accent-ink-foreground" onChange={(event) => {
        const next = Number(event.target.value);
        setVolume(next);
        if (audioRef.current) audioRef.current.volume = next;
        try { localStorage.setItem(volumeKey, String(next)); } catch {}
      }} />
    </aside>
  );
}
