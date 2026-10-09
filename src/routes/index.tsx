import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import cover from "@/assets/cover-cross-light.webp";
import { Footer, Rule, SectionLabel } from "@/components/book";
import { phases } from "@/lib/catalog";
import { getLandingAccount } from "@/lib/account-actions";
import { accessDecision } from "@/lib/accounts";

const homeAccountOptions = queryOptions({
  queryKey: ["home-account"],
  queryFn: () => getLandingAccount(),
  staleTime: 30_000,
  refetchInterval: 60_000,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Devocional Sempre Positivo — É amargo, mas cura" },
      {
        name: "description",
        content:
          "Um devocional cristão de 90 dias. Enfrente a verdade. Receba a cura. Viva a mudança.",
      },
      { property: "og:title", content: "Devocional Sempre Positivo — É amargo, mas cura" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        property: "og:description",
        content: "90 dias para enfrentar a verdade, receber a cura e viver a mudança.",
      },
    ],
  }),
  component: Index,
});

const journey = ["Confronto", "Reflexão", "Decisão", "Cura", "Mudança", "Transformação"];
const steps = ["Ler", "Refletir", "Escrever", "Decidir", "Orar", "Agir"];

function Index() {
  const { data: account } = useQuery(homeAccountOptions);
  const currentDay = account?.progress.currentDay;
  const completed = account?.progress.completed ?? 0;
  const hasAccess = accessDecision(
    account?.userId ?? null,
    account?.access?.access_status ?? null,
    account?.access?.expires_at ?? null,
  ) === "allowed";
  const primaryButton =
    "font-label border border-ember bg-ember px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-accent-foreground transition hover:brightness-110";
  return (
    <main>
      {/* CAPA */}
      <section className="relative min-h-screen overflow-hidden bg-ink text-ink-foreground">
        <img
          src={cover}
          alt=""
          fetchPriority="high"
          decoding="async"
          width={1672}
          height={941}
          className="absolute inset-x-0 top-0 h-[64svh] w-full object-cover object-[75%_center] [mask-image:linear-gradient(to_bottom,black_55%,transparent_100%)] md:[mask-image:none] md:inset-0 md:h-full md:object-center"
        />
        <div className="vignette absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent md:bg-gradient-to-r md:from-ink/80 md:via-ink/10 md:to-transparent" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(to_bottom,transparent_0%,color-mix(in_oklab,var(--ink)_15%,transparent)_35%,color-mix(in_oklab,var(--ink)_65%,transparent)_70%,var(--ink)_100%)]" />
        <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col justify-between px-6 py-10">
          <div className="flex items-center justify-between">
            <span className="eyebrow opacity-70">Devocional · 90 dias</span>
            <span className="eyebrow opacity-70">Sempre Positivo</span>
          </div>
          <div className="animate-rise max-w-2xl pt-[27svh] pb-12 md:py-0">
            <p className="eyebrow mb-10 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[#e88b70] [text-shadow:0_2px_12px_#000] md:text-ember md:[text-shadow:none]">
              <span className="text-[1.25rem] tracking-[0.2em] sm:text-[1.25rem] md:tracking-[0.32em]">Devocional</span>
              <span>Sempre Positivo</span>
            </p>
            <h1 className="font-display text-7xl uppercase leading-[0.95] sm:text-8xl md:text-[9rem]">
              É amargo,
              <br />
              <span className="text-ember">mas</span> cura.
            </h1>
            <p className="mt-8 max-w-md font-serif text-2xl italic opacity-90">
              Enfrente a verdade. Receba a cura. Viva a mudança.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              {hasAccess ? <Link
                to="/devocional"
                className={primaryButton}
              >
                {completed === 0
                  ? "Começar o Dia 01"
                  : currentDay
                    ? `Continuar no Dia ${String(currentDay).padStart(2, "0")}`
                    : "Revisitar o Dia 90"}
              </Link> : <a
                href="https://pay.kiwify.com.br/VoRoa1v"
                target="_blank"
                rel="noopener noreferrer"
                className={primaryButton}
              >
                Quero acessar o devocional
              </a>}
              <Link
                to="/sumario"
                className="font-label border border-ink-foreground/40 px-6 py-3 text-sm uppercase tracking-[0.2em] transition hover:border-ink-foreground"
              >
                Sumário
              </Link>
            </div>
            {!account && (
              <p className="mt-5 text-sm">
                <Link to="/login" className="text-ember">
                  Já comprei · Entrar na minha conta
                </Link>
              </p>
            )}
          </div>
          <p className="eyebrow opacity-60">
            90 dias para enfrentar a verdade, receber a cura e viver a mudança.
          </p>
        </div>
      </section>

      {/* Ease gradually into the paper background, with flat slopes at both ends. */}
      <div aria-hidden="true" className="pointer-events-none relative h-48 -mb-48 bg-[linear-gradient(to_bottom,var(--ink)_0%,color-mix(in_oklab,var(--ink)_97%,var(--background))_12%,color-mix(in_oklab,var(--ink)_87%,var(--background))_25%,color-mix(in_oklab,var(--ink)_68%,var(--background))_37%,color-mix(in_oklab,var(--ink)_42%,var(--background))_50%,color-mix(in_oklab,var(--ink)_19%,var(--background))_65%,color-mix(in_oklab,var(--ink)_6%,var(--background))_80%,color-mix(in_oklab,var(--ink)_1%,var(--background))_92%,var(--background)_100%)]" />

      {/* APRESENTAÇÃO */}
      <article className="mx-auto max-w-2xl px-6 pt-48">
        <SectionLabel>Apresentação</SectionLabel>
        <h2 className="font-display text-5xl uppercase leading-none md:text-6xl">
          Algumas verdades de Deus doem antes de curar.
        </h2>
        <div className="mt-10 space-y-6 text-lg leading-relaxed">
          <p>
            Este não é um devocional para fazer você se sentir bem por alguns minutos. É um caminho
            de 90 dias para enxergar, admitir, decidir e agir.
          </p>
          <p>
            O “amargo” não é crueldade. É a verdade que nem sempre queremos ouvir — mas que,
            recebida com humildade, pode produzir cura.
          </p>
        </div>
        <Rule className="my-20" />

        <SectionLabel>A jornada</SectionLabel>
        <ol className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3">
          {journey.map((j, i) => (
            <li key={j} className="bg-background p-5">
              <span className="font-label text-xs text-ember">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="font-display mt-2 text-2xl uppercase">{j}</p>
            </li>
          ))}
        </ol>

        <div className="mt-20">
          <SectionLabel>Como usar</SectionLabel>
          <p className="text-lg leading-relaxed">
            Um dia por vez. Cada página segue o mesmo caminho:
          </p>
          <p className="font-display mt-6 text-3xl uppercase leading-snug text-muted-foreground">
            {steps.map((s, i) => (
              <span key={s}>
                <span className="text-foreground">{s}</span>
                {i < steps.length - 1 && <span className="text-ember"> → </span>}
              </span>
            ))}
          </p>
          <p className="mt-8 text-lg leading-relaxed">
            Não apenas leia. Escreva nos espaços de cada dia — suas respostas ficam guardadas neste
            aparelho. Ao terminar, marque o dia como vivido e cumpra a tarefa antes que o dia acabe.
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
              <Link
                to="/fase/$n"
                params={{ n: String(p.n) }}
                className="group flex items-baseline justify-between gap-4 py-5"
              >
                <span className="flex items-baseline gap-5">
                  <span className="font-label text-xs text-ember">Fase {p.n}</span>
                  <span className="font-display text-2xl uppercase group-hover:text-ember">
                    {p.name}
                  </span>
                </span>
                <span className="font-label text-xs text-muted-foreground">{p.range}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-16 text-center">
          <Link
            to="/fase/$n"
            params={{ n: "1" }}
            className="font-label inline-block bg-primary px-8 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground hover:bg-ember"
          >
            Abrir a Fase 1
          </Link>
        </div>
      </article>
      <Footer page="i" />
    </main>
  );
}
