import { Link } from "@tanstack/react-router";
import { LockKeyhole } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { waitingForNextDay } from "@/lib/progression";
import { useJourney } from "@/hooks/use-journey";
import { Footer, TopBar, pad } from "./book";

export const LOCK_MESSAGE =
  "Ainda não. Algumas verdades precisam ser vividas antes de serem lidas.";

export function JourneyDayLink({
  n,
  children,
  className = "",
}: {
  n: number;
  children: ReactNode;
  className?: string;
}) {
  const progress = useJourney();
  const [notice, setNotice] = useState(false);
  if (!progress.canRead(n))
    return (
      <>
        <button
          type="button"
          onClick={() => setNotice(true)}
          aria-disabled="true"
          className={`${className} w-full text-left text-muted-foreground`}
        >
          {children}
          <span className="font-label flex items-center gap-1 text-xs">
            <LockKeyhole size={13} aria-hidden="true" />
            Bloqueado
          </span>
        </button>
        {notice && (
          <p role="status" className="pb-3 text-sm italic text-muted-foreground">
            {LOCK_MESSAGE}
            {n === progress.currentDay && <NextDayWait />}
          </p>
        )}
      </>
    );
  return (
    <Link
      to="/dia/$n"
      params={{ n: String(n) }}
      className={`${className} ${n === progress.currentDay ? "text-ember" : ""}`}
      aria-current={n === progress.currentDay ? "step" : undefined}
    >
      {children}
      <span className="font-label text-xs">
        {n <= progress.completed ? "Concluído" : "Seu dia atual"}
      </span>
    </Link>
  );
}

export function JourneyProgress() {
  const progress = useJourney();
  const { completed, currentDay } = progress;
  return (
    <div className="mt-6">
      <p className="font-label text-sm text-muted-foreground">
        {completed} de 90 dias concluídos
        {progress.maxReadableDay === 1 ? " · Amostra: Dia 01" : currentDay
          ? ` · ${waitingForNextDay(progress) ? "Próximo dia" : "Seu dia atual"}: ${pad(currentDay)}`
          : " · Jornada completa"}
      </p>
      <NextDayWait />
      <div
        role="progressbar"
        aria-label="Progresso da jornada"
        aria-valuemin={0}
        aria-valuemax={90}
        aria-valuenow={completed}
        className="mt-3 h-px w-full bg-border"
      >
        <div className="h-px bg-ember" style={{ width: `${(completed / 90) * 100}%` }} />
      </div>
    </div>
  );
}

export function LockedDay() {
  const progress = useJourney();
  const { currentDay } = progress;
  const returnDay = progress.maxReadableDay === 1 ? 1 : waitingForNextDay(progress) ? progress.completed : (currentDay ?? 90);
  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-2xl px-6 pt-20">
        <p className="eyebrow flex items-center gap-2 text-ember">
          <LockKeyhole size={16} />
          Dia bloqueado
        </p>
        <h1 className="font-display mt-4 text-5xl uppercase">Um dia de cada vez.</h1>
        <p className="mt-8 font-serif text-2xl italic">{LOCK_MESSAGE}</p>
        <JourneyProgress />
        <Link
          to="/dia/$n"
          params={{ n: String(returnDay) }}
          className="font-label mt-10 inline-block bg-primary px-6 py-3 text-sm uppercase tracking-[0.2em] text-primary-foreground"
        >
          Voltar ao Dia {pad(returnDay)}
        </Link>
      </main>
      <Footer />
    </>
  );
}

export function NextDayWait() {
  const progress = useJourney();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  if (progress.maxReadableDay === 1) return (
    <span className="mt-2 block text-sm text-muted-foreground" role="status">
      Sua amostra inclui somente o Dia 1. Para continuar a jornada, adquira o devocional.
      <Link to="/compra" className="mt-3 block text-ember">Quero acessar o devocional</Link>
    </span>
  );
  if (!progress.nextAvailableAt || !progress.currentDay) return null;
  const remaining = Date.parse(progress.nextAvailableAt) - (now ?? Date.now());
  if (remaining <= 0) return null;
  const minutes = Math.ceil(remaining / 60_000);
  return (
    <span className="mt-2 block text-sm text-muted-foreground" role="status">
      {now === null
        ? "O próximo dia será liberado 6 horas após a conclusão."
        : `Dia ${pad(progress.currentDay)} disponível em ${Math.floor(minutes / 60)}h ${minutes % 60}min. Você pode reler os dias concluídos.`}
    </span>
  );
}
