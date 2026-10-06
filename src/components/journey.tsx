import { Link } from "@tanstack/react-router";
import { LockKeyhole } from "lucide-react";
import { useState, type ReactNode } from "react";
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
  const { completed, currentDay } = useJourney();
  return (
    <div className="mt-6">
      <p className="font-label text-sm text-muted-foreground">
        {completed} de 90 dias concluídos
        {currentDay ? ` · Seu dia atual: ${pad(currentDay)}` : " · Jornada completa"}
      </p>
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
  const { currentDay } = useJourney();
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
          params={{ n: String(currentDay ?? 90) }}
          className="font-label mt-10 inline-block bg-primary px-6 py-3 text-sm uppercase tracking-[0.2em] text-primary-foreground"
        >
          Continuar no Dia {pad(currentDay ?? 90)}
        </Link>
      </main>
      <Footer />
    </>
  );
}
