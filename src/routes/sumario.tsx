import { createFileRoute, Link } from "@tanstack/react-router";
import { Footer, TopBar, pad, useDone } from "@/components/book";
import { JourneyDayLink, JourneyProgress } from "@/components/journey";
import { days, phases } from "@/lib/catalog";

export const Route = createFileRoute("/sumario")({
  head: () => ({
    meta: [
      { title: "Sumário — Devocional Sempre Positivo" },
      {
        name: "description",
        content: "Os 90 dias do devocional É Amargo, Mas Cura, divididos em seis fases.",
      },
      { property: "og:title", content: "Sumário — Devocional Sempre Positivo" },
      {
        property: "og:description",
        content: "Seis fases, 90 dias: do Espelho a Não Volte a Ser Quem Era.",
      },
    ],
  }),
  component: Sumario,
});

function Sumario() {
  const { completed } = useDone();
  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-3xl px-6 pt-20">
        <p className="eyebrow text-ember">Sumário</p>
        <h1 className="font-display mt-4 text-6xl uppercase">90 dias</h1>
        <JourneyProgress />
        {phases.map((p) => (
          <section key={p.n} className="mt-16">
            <Link
              to="/fase/$n"
              params={{ n: String(p.n) }}
              className="group flex items-baseline gap-4 border-b border-foreground pb-3"
            >
              <span className="font-label text-xs text-ember">Fase {p.n}</span>
              <h2 className="font-display text-3xl uppercase group-hover:text-ember">{p.name}</h2>
            </Link>
            <ul>
              {days
                .filter((d) => d.phase === p.n)
                .map((d) => (
                  <li key={d.n} className="border-b border-border">
                    <JourneyDayLink n={d.n} className="group flex items-baseline gap-5 py-3">
                      <span className="font-label w-8 text-xs tabular-nums text-muted-foreground">
                        {pad(d.n)}
                      </span>
                      <span className="flex-1 font-body group-hover:text-ember">{d.title}</span>
                    </JourneyDayLink>
                  </li>
                ))}
            </ul>
          </section>
        ))}
        {completed === 90 && (
          <Link
            to="/encerramento"
            className="font-display mt-16 block border-b border-foreground pb-3 text-3xl uppercase hover:text-ember"
          >
            Encerramento
          </Link>
        )}
      </main>
      <Footer page="ii" />
    </>
  );
}
