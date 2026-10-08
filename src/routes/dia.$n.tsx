import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Footer, Rule, SectionLabel, TopBar, WriteArea, pad, useDone } from "@/components/book";
import { readDay } from "@/lib/journey";
import { LockedDay, JourneyProgress, JourneyDayLink, NextDayWait } from "@/components/journey";
import { useEffect, useState } from "react";
import { ShareRemedy } from "@/components/share-remedy";

export const Route = createFileRoute("/dia/$n")({
  loader: async ({ params }) => {
    const n = Number(params.n);
    if (!Number.isInteger(n) || n < 1 || n > 90) throw notFound();
    return readDay({ data: n });
  },
  staleTime: 0,
  preloadStaleTime: 0,
  head: ({ loaderData }) => {
    if (!loaderData?.day)
      return { meta: [{ title: "Dia não encontrado" }, { name: "robots", content: "noindex" }] };
    const { day } = loaderData;
    const t = `Dia ${pad(day.n)} — ${day.title} | Sempre Positivo`;
    const d = `${day.verse.join(" ")} ${day.reference}`;
    return {
      meta: [
        { title: t },
        { name: "description", content: d },
        { property: "og:title", content: t },
        { property: "og:description", content: d },
      ],
    };
  },
  component: Dia,
});

function Paras({ items, className = "" }: { items: string[]; className?: string }) {
  return (
    <div className={`space-y-5 ${className}`}>
      {items.map((p, i) => (
        <p key={i} className="whitespace-pre-line">
          {p}
        </p>
      ))}
    </div>
  );
}

function Dia() {
  const { day, phase } = Route.useLoaderData();
  const { done, complete, canRead } = useDone();
  const [saving, setSaving] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setConfirmation(false);
    setError("");
  }, [day?.n]);
  if (!day || !phase) return <LockedDay />;
  const isDone = done.includes(day.n);
  const isPhaseEnd = day.n === phase.days[1];
  return (
    <>
      <TopBar>
        <span className="font-label hidden text-xs text-muted-foreground sm:inline">
          Fase {phase.n} · {phase.name}
        </span>
      </TopBar>
      <main key={day.n} className="mx-auto max-w-2xl px-6 pt-20 animate-rise">
        {/* Cabeçalho */}
        <div className="flex items-end gap-6 border-b border-foreground pb-6">
          <span className="font-display text-[7rem] leading-[0.8] text-ember md:text-[9rem]">
            {pad(day.n)}
          </span>
          <span className="eyebrow pb-2 text-muted-foreground">
            Dia
            <br />
            de 90
          </span>
        </div>
        <h1 className="font-display mt-10 text-5xl uppercase leading-[0.95] md:text-6xl">
          {day.title}
        </h1>

        {/* Versículo */}
        <figure className="mt-14">
          <p className="eyebrow mb-4 text-muted-foreground">Versículo</p>
          <blockquote className="font-serif text-3xl italic leading-snug md:text-4xl">
            {day.verse.map((v, i) => (
              <span key={i} className="block">
                {v}
              </span>
            ))}
          </blockquote>
          <figcaption className="font-label mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-ember">
            {day.reference}
          </figcaption>
        </figure>

        <Rule className="my-16" />

        <section>
          <SectionLabel>A verdade que dói</SectionLabel>
          <Paras items={day.truth} className="text-xl leading-relaxed" />
        </section>

        <section className="mt-16 border-l-2 border-ember bg-secondary/60 px-6 py-8 md:px-10">
          <SectionLabel>O remédio</SectionLabel>
          <Paras items={day.remedy} className="text-xl font-semibold leading-relaxed" />
        </section>
        <ShareRemedy remedy={day.remedy} />

        {/* Tarefa */}
        <section className="page-sheet mt-20 px-6 py-10 md:px-10">
          <SectionLabel>Tarefa para hoje</SectionLabel>
          <p className="font-display text-2xl uppercase leading-tight">
            Não feche esta página sem responder
          </p>
          <div className="mt-8 space-y-6">
            {day.task.map((t, i) =>
              t.type === "text" ? (
                <p key={i} className="font-serif text-2xl leading-snug">
                  {t.text}
                </p>
              ) : (
                <WriteArea key={i} storageKey={`d${day.n}-${i}`} lines={t.lines} label={t.label} />
              ),
            )}
          </div>
        </section>

        <section className="mt-20">
          <SectionLabel>Uma oração sem desculpas</SectionLabel>
          <Paras items={day.prayer} className="font-serif text-2xl italic leading-relaxed" />
        </section>

        {day.closing.length > 0 && (
          <div className="mt-20 border-y border-foreground py-10 text-center">
            {day.closing.map((c, i) => (
              <p
                key={i}
                className={`font-display uppercase leading-tight ${i === 0 ? "text-3xl md:text-4xl" : "mt-4 text-xl text-ember"}`}
              >
                {c}
              </p>
            ))}
          </div>
        )}

        <div className="mt-14 flex justify-center">
          <button
            disabled={isDone || saving}
            onClick={async () => {
              setSaving(true);
              setError("");
              try {
                await complete(day.n);
                setConfirmation(true);
              } catch {
                setError("Não foi possível salvar. Tente concluir este dia novamente.");
              } finally {
                setSaving(false);
              }
            }}
            className={`font-label px-6 py-3 text-xs font-semibold uppercase tracking-[0.25em] transition ${isDone ? "bg-ember text-accent-foreground" : "border border-foreground hover:bg-foreground hover:text-background"}`}
          >
            {isDone ? "Dia concluído ✓" : saving ? "Salvando…" : "Concluir este dia"}
          </button>
        </div>

        <JourneyProgress />
        {error && (
          <p role="alert" className="mt-4 text-center text-sm text-ember">
            {error}
          </p>
        )}
        {confirmation && (
          <div role="status" className="mt-6 text-center">
            <p>Dia {pad(day.n)} concluído.</p>
            <p className="mt-2 font-serif italic">Você não precisa correr. Apenas continue.</p>
            {day.n < 90 ? (
              canRead(day.n + 1) ? (
                <Link
                  to="/dia/$n"
                  params={{ n: String(day.n + 1) }}
                  className="font-label mt-4 inline-block border border-foreground px-6 py-3 text-sm uppercase"
                >
                  Continuar para o Dia {pad(day.n + 1)}
                </Link>
              ) : (
                <NextDayWait />
              )
            ) : (
              <Link
                to="/encerramento"
                className="font-label mt-4 inline-block border border-foreground px-6 py-3 text-sm uppercase"
              >
                Jornada completa — ver encerramento
              </Link>
            )}
          </div>
        )}

        <nav className="mt-16 grid grid-cols-2 gap-px bg-border">
          {day.n > 1 ? (
            <Link
              to="/dia/$n"
              params={{ n: String(day.n - 1) }}
              className="bg-background p-5 hover:text-ember"
            >
              <span className="eyebrow text-muted-foreground">← Anterior</span>
              <p className="font-display mt-1 text-xl">Dia {pad(day.n - 1)}</p>
            </Link>
          ) : (
            <Link to="/fase/$n" params={{ n: "1" }} className="bg-background p-5 hover:text-ember">
              <span className="eyebrow text-muted-foreground">← Voltar</span>
              <p className="font-display mt-1 text-xl">Fase 1</p>
            </Link>
          )}
          {day.n === 90 ? (
            <Link to="/encerramento" className="bg-background p-5 text-right hover:text-ember">
              <span className="eyebrow text-muted-foreground">Seguir →</span>
              <p className="font-display mt-1 text-xl">Encerramento</p>
            </Link>
          ) : isPhaseEnd ? (
            <Link
              to="/fase/$n"
              params={{ n: String(phase.n + 1) }}
              className="bg-background p-5 text-right hover:text-ember"
            >
              <span className="eyebrow text-muted-foreground">Próxima fase →</span>
              <p className="font-display mt-1 text-xl">Fase {phase.n + 1}</p>
            </Link>
          ) : (
            <JourneyDayLink n={day.n + 1} className="bg-background p-5 text-right hover:text-ember">
              <span className="eyebrow text-muted-foreground">Próximo →</span>
              <p className="font-display mt-1 text-xl">Dia {pad(day.n + 1)}</p>
            </JourneyDayLink>
          )}
        </nav>
      </main>
      <Footer page={day.n} />
    </>
  );
}
