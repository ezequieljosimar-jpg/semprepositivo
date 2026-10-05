import { createFileRoute, Link } from "@tanstack/react-router";
import { Footer, TopBar, pad, useDone } from "@/components/book";
import { days, phases } from "@/lib/devocional";

export const Route = createFileRoute("/sumario")({
  head: () => ({
    meta: [
      { title: "Sumário — Devocional Sempre Positivo" },
      { name: "description", content: "Os 90 dias do devocional É Amargo, Mas Cura, divididos em seis fases." },
      { property: "og:title", content: "Sumário — Devocional Sempre Positivo" },
      { property: "og:description", content: "Seis fases, 90 dias: do Espelho a Não Volte a Ser Quem Era." },
    ],
  }),
  component: Sumario,
});

function Sumario() {
  const { done } = useDone();
  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-3xl px-6 pt-20">
        <p className="eyebrow text-ember">Sumário</p>
        <h1 className="font-display mt-4 text-6xl uppercase">90 dias</h1>
        <p className="font-label mt-4 text-sm text-muted-foreground">{done.length} de 90 dias vividos</p>
        <div className="mt-3 h-px w-full bg-border">
          <div className="h-px bg-ember" style={{ width: `${(done.length / 90) * 100}%` }} />
        </div>
        {phases.map((p) => (
          <section key={p.n} className="mt-16">
            <Link to="/fase/$n" params={{ n: String(p.n) }} className="group flex items-baseline gap-4 border-b border-foreground pb-3">
              <span className="font-label text-xs text-ember">Fase {p.n}</span>
              <h2 className="font-display text-3xl uppercase group-hover:text-ember">{p.name}</h2>
            </Link>
            <ul>
              {days.filter((d) => d.phase === p.n).map((d) => (
                <li key={d.n} className="border-b border-border">
                  <Link to="/dia/$n" params={{ n: String(d.n) }} className="group flex items-baseline gap-5 py-3">
                    <span className="font-label w-8 text-xs tabular-nums text-muted-foreground">{pad(d.n)}</span>
                    <span className="flex-1 font-body group-hover:text-ember">{d.title}</span>
                    {done.includes(d.n) && <span className="h-1.5 w-1.5 rotate-45 bg-ember" aria-label="vivido" />}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <Link to="/encerramento" className="font-display mt-16 block border-b border-foreground pb-3 text-3xl uppercase hover:text-ember">
          Encerramento
        </Link>
      </main>
      <Footer page="ii" />
    </>
  );
}
