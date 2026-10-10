import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Check, PenLine, Target } from "lucide-react";
import cover from "@/assets/cover.jpg";
import { Footer, SectionLabel } from "@/components/book";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { phases } from "@/lib/catalog";
import { phaseImages } from "@/lib/phase-images";

const CHECKOUT_URL = "https://pay.kiwify.com.br/VoRoa1v";

export const Route = createFileRoute("/vendas")({
  head: () => ({
    meta: [
      { title: "É Amargo, Mas Cura — Devocional Sempre Positivo" },
      {
        name: "description",
        content:
          "Uma jornada digital de 90 dias para enfrentar a verdade, fortalecer sua fé e transformar reflexão em atitude.",
      },
      { property: "og:title", content: "É Amargo, Mas Cura — Devocional Sempre Positivo" },
      {
        property: "og:description",
        content:
          "90 dias para enfrentar a verdade, fortalecer sua fé e transformar reflexão em atitude.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SalesPage,
});

const features = [
  {
    icon: BookOpen,
    title: "Leituras diárias",
    text: "Uma verdade, um remédio e uma direção clara para cada dia da jornada.",
  },
  {
    icon: PenLine,
    title: "Reflexão e respostas",
    text: "Perguntas diretas e espaço para registrar o que precisa ser reconhecido.",
  },
  {
    icon: Target,
    title: "Oração e atitude",
    text: "Uma oração sem desculpas e uma tarefa prática para levar a leitura à vida.",
  },
  {
    icon: Check,
    title: "Progresso da jornada",
    text: "Acompanhe os dias concluídos e continue no seu ritmo, um dia de cada vez.",
  },
];

const faq = [
  {
    question: "O devocional é físico?",
    answer:
      "Não. É uma plataforma digital, acessível pelo navegador do celular ou do computador.",
  },
  {
    question: "Como recebo o acesso?",
    answer:
      "Faça a compra usando o mesmo e-mail da sua conta no Devocional. Após a aprovação do pagamento, entre nessa conta para acessar a jornada.",
  },
  {
    question: "Qual é o ritmo da jornada?",
    answer:
      "Um dia de cada vez. Depois de concluir o dia atual, o próximo é liberado após 12 horas. Você pode reler os dias já concluídos.",
  },
  {
    question: "Preciso baixar um aplicativo?",
    answer: "Não. O acesso é feito diretamente pelo navegador, sem instalação.",
  },
];

function CheckoutLink({ children }: { children: string }) {
  return (
    <a
      href={CHECKOUT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="font-label inline-flex min-h-14 items-center justify-center border border-ember bg-ember px-7 py-4 text-center text-sm font-semibold uppercase tracking-[0.2em] text-accent-foreground transition hover:brightness-110"
    >
      {children}
    </a>
  );
}

function SalesPage() {
  return (
    <main className="bg-ink text-ink-foreground">
      <section className="relative min-h-[92vh] overflow-hidden border-b border-ink-foreground/15">
        <img
          src={cover}
          alt="Frasco escuro aberto com comprimidos sobre uma superfície"
          width={1920}
          height={1088}
          className="photo-bw absolute inset-0 h-full w-full object-cover object-[70%_center] opacity-70"
        />
        <div className="vignette absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-ink/15 md:bg-gradient-to-r md:from-ink md:via-ink/70 md:to-transparent" />
        <div className="relative mx-auto flex min-h-[92vh] max-w-6xl flex-col px-6 py-8 md:px-10">
          <nav className="flex items-center justify-between gap-5">
            <Link to="/" className="font-display text-lg uppercase">
              Sempre Positivo<span className="text-ember">.</span>
            </Link>
            <Link to="/login" className="eyebrow text-ink-foreground/70 hover:text-ember">
              Já comprei · Entrar
            </Link>
          </nav>
          <div className="my-auto max-w-2xl py-16 animate-rise">
            <p className="eyebrow text-ember">Devocional digital · 90 dias</p>
            <h1 className="font-display mt-5 text-6xl uppercase leading-[0.92] sm:text-7xl md:text-8xl">
              É amargo,
              <br />
              <span className="text-ember">mas</span> cura.
            </h1>
            <h2 className="font-display mt-8 max-w-xl text-3xl uppercase leading-tight md:text-4xl">
              Não deixe sua mudança para amanhã.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-foreground/85 md:text-xl">
              90 dias para enfrentar a verdade, fortalecer sua fé e transformar reflexão em
              atitude.
            </p>
            <div className="mt-9">
              <CheckoutLink>Quero começar minha jornada</CheckoutLink>
            </div>
          </div>
          <p className="eyebrow max-w-lg text-ink-foreground/60">
            Enfrente a verdade · Fortaleça sua fé · Escolha agir
          </p>
        </div>
      </section>

      <section className="bg-background text-foreground">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 md:grid-cols-[0.85fr_1.15fr] md:px-10 md:py-32">
          <div>
            <SectionLabel>Um convite à mudança</SectionLabel>
            <h2 className="font-display text-5xl uppercase leading-none md:text-6xl">
              Algumas verdades doem antes de curar.
            </h2>
          </div>
          <div className="space-y-6 text-xl leading-relaxed">
            <p>
              Talvez você já tenha percebido padrões que precisam terminar, atitudes que continua
              adiando e uma rotina com Deus que deseja cultivar com mais constância.
            </p>
            <p>
              Este devocional não oferece atalhos nem resultados garantidos. Ele propõe um caminho
              diário de leitura, confronto, escrita, oração e prática — para quem decidiu parar de
              apenas pensar na mudança e começar a responder a ela.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-ink-foreground/15">
        <div className="mx-auto max-w-6xl px-6 py-24 md:px-10 md:py-32">
          <SectionLabel>Dentro da plataforma</SectionLabel>
          <h2 className="font-display max-w-3xl text-5xl uppercase leading-none md:text-6xl">
            Uma experiência feita para ler, responder e agir.
          </h2>
          <div className="mt-14 grid border-y border-ink-foreground/15 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="border-b border-ink-foreground/15 px-1 py-8 sm:px-6 sm:[&:nth-child(odd)]:border-r lg:border-b-0 lg:border-r lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0"
              >
                <Icon className="h-6 w-6 text-ember" aria-hidden="true" />
                <h3 className="font-display mt-6 text-2xl uppercase">{title}</h3>
                <p className="mt-3 leading-relaxed text-ink-foreground/70">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-6xl px-6 py-24 md:px-10 md:py-32">
          <SectionLabel>A jornada</SectionLabel>
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <h2 className="font-display max-w-2xl text-5xl uppercase leading-none md:text-6xl">
              Seis fases. Noventa dias.
            </h2>
            <p className="max-w-sm text-lg leading-relaxed text-muted-foreground">
              Cada fase aprofunda uma pergunta necessária, sem apressar o processo.
            </p>
          </div>
          <div className="mt-14 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
            {phases.map((phase, index) => (
              <article key={phase.n} className="group relative min-h-72 overflow-hidden bg-ink">
                <img
                  src={phaseImages[index]}
                  alt=""
                  width={1024}
                  height={1280}
                  loading="lazy"
                  className="photo-bw absolute inset-0 h-full w-full object-cover opacity-35 transition duration-500 group-hover:scale-[1.02] group-hover:opacity-45"
                />
                <div className="vignette absolute inset-0" />
                <div className="relative flex min-h-72 flex-col justify-between p-7 text-ink-foreground">
                  <p className="eyebrow text-ember">Fase {phase.n}</p>
                  <div>
                    <h3 className="font-display text-3xl uppercase leading-none">{phase.name}</h3>
                    <p className="font-label mt-3 text-xs uppercase text-ink-foreground/65">
                      {phase.range}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-ink-foreground/15">
        <div className="mx-auto max-w-6xl px-6 py-24 md:px-10 md:py-32">
          <SectionLabel>Como funciona</SectionLabel>
          <h2 className="font-display text-5xl uppercase leading-none md:text-6xl">
            Do checkout ao primeiro dia.
          </h2>
          <ol className="mt-14 grid gap-px bg-ink-foreground/15 md:grid-cols-4">
            {[
              ["01", "Faça a compra", "Finalize com segurança no checkout da Kiwify."],
              ["02", "Use o mesmo e-mail", "Crie ou acesse sua conta com o e-mail usado na compra."],
              ["03", "Aguarde a aprovação", "O pagamento aprovado libera o acesso automaticamente."],
              ["04", "Viva um dia por vez", "Conclua o dia atual e siga a sequência da jornada."],
            ].map(([number, title, text]) => (
              <li key={number} className="bg-ink px-6 py-8">
                <span className="font-display text-4xl text-ember">{number}</span>
                <h3 className="font-display mt-10 text-2xl uppercase">{title}</h3>
                <p className="mt-3 leading-relaxed text-ink-foreground/70">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-3xl px-6 py-24 md:py-32">
          <SectionLabel>Perguntas frequentes</SectionLabel>
          <h2 className="font-display text-5xl uppercase leading-none md:text-6xl">
            Antes de começar.
          </h2>
          <Accordion type="single" collapsible className="mt-12 border-t border-border">
            {faq.map((item) => (
              <AccordionItem key={item.question} value={item.question}>
                <AccordionTrigger className="font-display py-6 text-left text-xl uppercase hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="max-w-2xl pb-6 text-lg leading-relaxed text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-ink-foreground/15">
        <img
          src={cover}
          alt=""
          width={1920}
          height={1088}
          loading="lazy"
          className="photo-bw absolute inset-0 h-full w-full object-cover opacity-20"
        />
        <div className="vignette absolute inset-0" />
        <div className="relative mx-auto max-w-4xl px-6 py-28 text-center md:py-36">
          <p className="eyebrow text-ember">Sempre Positivo</p>
          <h2 className="font-display mt-5 text-5xl uppercase leading-none md:text-7xl">
            Não deixe sua mudança para amanhã.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-xl leading-relaxed text-ink-foreground/75">
            Comece uma jornada de 90 dias para transformar reflexão em atitude.
          </p>
          <div className="mt-9">
            <CheckoutLink>Quero começar minha jornada</CheckoutLink>
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 border-t border-ink-foreground/15 px-6 py-8 text-sm text-ink-foreground/65 sm:flex-row md:px-10">
        <Link to="/" className="hover:text-ember">
          Página inicial
        </Link>
        <Link to="/login" className="hover:text-ember">
          Já comprei · Entrar na minha conta
        </Link>
      </div>
      <Footer />
    </main>
  );
}