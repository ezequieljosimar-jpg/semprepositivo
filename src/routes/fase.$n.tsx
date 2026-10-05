import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Footer, TopBar, pad } from "@/components/book";
import { days, getPhase } from "@/lib/devocional";
import { phaseImages, phaseLines } from "@/lib/phase-images";

export const Route = createFileRoute("/fase/$n")({
  loader: ({ params }) => {
    const phase = getPhase(Number(params.n));
    if (!phase) throw notFound();
    return { phase };
  },
  head: ({ loaderData }) => {
    const t = loaderData ? `Fase ${loaderData.phase.n} — ${loaderData.phase.name} | Sempre Positivo` : "Fase não encontrada";
    const d = loaderData ? loaderData.phase.question : "";
    return { meta: [{ title: t }, { name: "description", content: d }, { property: "og:title", content: t }, { property: "og:description", content: d }] };
  },
  component: Fase,
});

function Fase() {
  const { phase } = Route.useLoaderData();
  const list = days.filter((d) => d.phase === phase.n);
  return (
    <>
      <TopBar />
      <section className="relative overflow-hidden bg-ink text-ink-foreground">
        <img src={phaseImages[phase.n - 1]} alt="" width={1024} height={1280} className="photo-bw absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="vignette absolute inset-0" />
        <div className="relative mx-auto flex min-h-[88vh] max-w-5xl flex-col justify-end px-6 pb-16">
          <div className="animate-rise">
            <p className="eyebrow text-ember">Fase {phase.n} · {phase.range}</p>
            <h1 className="font-display mt-4 max-w-3xl text-6xl uppercase leading-[0.92] md:text-8xl">{phase.name}</h1>
            <p className="mt-8 max-w-xl font-serif text-2xl italic opacity-90">{phaseLines[phase.n - 1]}</p>
          </div>
        </div>
      </section>
      <main className="mx-auto max-w-2xl px-6 pt-20">
        <p className="eyebrow text-muted-foreground">A pergunta desta fase</p>
        <p className="mt-4 font-serif text-3xl italic leading-snug">“{phase.question}”</p>
        <ul className="mt-16 border-t border-border">
          {list.map((d) => (
            <li key={d.n} className="border-b border-border">
              <Link to="/dia/$n" params={{ n: String(d.n) }} className="group flex items-baseline gap-5 py-4">
                <span className="font-display w-10 text-xl text-ember">{pad(d.n)}</span>
                <span className="flex-1 group-hover:text-ember">{d.title}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-12">
          <Link to="/dia/$n" params={{ n: String(phase.days[0]) }} className="font-label inline-block bg-primary px-8 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground hover:bg-ember">
            Começar o Dia {pad(phase.days[0])}
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
