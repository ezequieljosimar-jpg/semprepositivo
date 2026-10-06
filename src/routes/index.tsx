import { createFileRoute, Link } from "@tanstack/react-router";
import cover from "@/assets/cover.jpg";
import { Footer, Rule, SectionLabel } from "@/components/book";
import { phases } from "@/lib/devocional";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Devocional Sempre Positivo — É amargo, mas cura" },
      { name: "description", content: "Um devocional cristão de 90 dias. Enfrente a verdade. Receba a cura. Viva a mudança." },
      { property: "og:title", content: "Devocional Sempre Positivo — É amargo, mas cura" },
      { property: "og:description", content: "90 dias para enfrentar a verdade, receber a cura e viver a mudança." },
    ],
  }),
  component: Index,
});

const journey = ["Confronto", "Reflexão", "Decisão", "Cura", "Mudança", "Transformação"];
const steps = ["Ler", "Refletir", "Escrever", "Decidir", "Orar", "Agir"];

function Index() {
  return (
    <main>
      {/* CAPA */}
      <section className="relative min-h-screen overflow-hidden bg-ink text-ink-foreground">
        <img src={cover} alt="" width={1024} height={1408} className="photo-bw absolute inset-0 h-full w-full object-cover opacity-80" />
        <div className="vignette absolute inset-0" />
        <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col justify-between px-6 py-10">
          <div className="flex items-center justify-between">
            <span className="eyebrow opacity-70">Devocional · 90 dias</span>
            <span className="eyebrow opacity-70">Sempre Positivo</span>
          </div>
          <div className="animate-rise max-w-2xl">
            <p className="eyebrow mb-10 text-ember">Devocional Sempre Positivo</p>
            <h1 className="font-display text-7xl uppercase leading-[0.95] sm:text-8xl md:text-[9rem]">
              É amargo,
              <br />
              <span className="text-ember">mas</span> cura.
            </h1>
            <p className="mt-8 max-w-md font-serif text-2xl italic opacity-90">
              Enfrente a verdade. Receba a cura. Viva a mudança.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/dia/$n" params={{ n: "1" }} className="font-label border border-ember bg-ember px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-accent-foreground transition hover:brightness-110">
                Começar o Dia 01
              </Link>
              <Link to="/sumario" className="font-label border border-ink-foreground/40 px-6 py-3 text-sm uppercase tracking-[0.2em] transition hover:border-ink-foreground">
                Sumário
              </Link>
            </div>
          </div>
          <p className="eyebrow opacity-60">90 dias para enfrentar a verdade, receber a cura e viver a mudança.</p>
        </div>
      </section>

      {/* APRESENTAÇÃO */}
      <article className="mx-auto max-w-2xl px-6 pt-28">
        <SectionLabel>Apresentação</SectionLabel>
        <h2 className="font-display text-5xl uppercase leading-none md:text-6xl">Algumas verdades de Deus doem antes de curar.</h2>
        <div className="mt-10 space-y-6 text-lg leading-relaxed">
          <p>Este não é um devocional para fazer você se sentir bem por alguns minutos. É um caminho de 90 dias para enxergar, admitir, decidir e agir.</p>
          <p>O “amargo” não é crueldade. É a verdade que nem sempre queremos ouvir — mas que, recebida com humildade, pode produzir cura.</p>
        </div>
        <Rule className="my-20" />

        <SectionLabel>A jornada</SectionLabel>
        <ol className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3">
          {journey.map((j, i) => (
            <li key={j} className="bg-background p-5">
              <span className="font-label text-xs text-ember">{String(i + 1).padStart(2, "0")}</span>
              <p className="font-display mt-2 text-2xl uppercase">{j}</p>
            </li>
          ))}
        </ol>

        <div className="mt-20">
          <SectionLabel>Como usar</SectionLabel>
          <p className="text-lg leading-relaxed">Um dia por vez. Cada página segue o mesmo caminho:</p>
          <p className="font-display mt-6 text-3xl uppercase leading-snug text-muted-foreground">
            {steps.map((s, i) => (
              <span key={s}>
                <span className="text-foreground">{s}</span>
                {i < steps.length - 1 && <span className="text-ember"> → </span>}
              </span>
            ))}
          </p>
          <p className="mt-8 text-lg leading-relaxed">
            Não apenas leia. Escreva nos espaços de cada dia — suas respostas ficam guardadas neste aparelho. Ao terminar, marque o dia como vivido e cumpra a tarefa antes que o dia acabe.
          </p>
          <blockquote className="mt-12 border-l-2 border-ember pl-6 font-serif text-2xl italic">
            “Isso está me deixando mais confortável ou mais transformado?”
          </blockquote>
        </div>

        <Rule className="my-20" />
        <SectionLabel>As seis fases</SectionLabel>
        <ul className="divide-y divide-border border-y border-border">
          {phases.map((p) => (
            <li key={p.n}>
              <Link to="/fase/$n" params={{ n: String(p.n) }} className="group flex items-baseline justify-between gap-4 py-5">
                <span className="flex items-baseline gap-5">
                  <span className="font-label text-xs text-ember">Fase {p.n}</span>
                  <span className="font-display text-2xl uppercase group-hover:text-ember">{p.name}</span>
                </span>
                <span className="font-label text-xs text-muted-foreground">{p.range}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-16 text-center">
          <Link to="/fase/$n" params={{ n: "1" }} className="font-label inline-block bg-primary px-8 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground hover:bg-ember">
            Abrir a Fase 1
          </Link>
        </div>
      </article>
      <Footer page="i" />
    </main>
  );
}
