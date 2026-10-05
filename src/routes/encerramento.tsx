import { createFileRoute, Link } from "@tanstack/react-router";
import cover from "@/assets/fase6.jpg";
import { Footer } from "@/components/book";
import { closingPage } from "@/lib/devocional";

export const Route = createFileRoute("/encerramento")({
  head: () => ({
    meta: [
      { title: "Encerramento — Enfrente a verdade. Receba a cura. Viva a mudança." },
      { name: "description", content: "A página final do devocional de 90 dias É Amargo, Mas Cura." },
      { property: "og:title", content: "Encerramento — Devocional Sempre Positivo" },
      { property: "og:description", content: "Enfrente a verdade. Receba a cura. Viva a mudança." },
    ],
  }),
  component: Encerramento,
});

const FINAL = ["ENFRENTE A VERDADE.", "RECEBA A CURA.", "VIVA A MUDANÇA.", "É AMARGO.", "MAS CURA."];

function Encerramento() {
  const [title, ...rest] = closingPage;
  const body = rest.filter((p) => !FINAL.includes(p));
  return (
    <main className="bg-ink text-ink-foreground">
      <section className="relative min-h-[70vh] overflow-hidden">
        <img src={cover} alt="" width={1024} height={1280} className="photo-bw absolute inset-0 h-full w-full object-cover opacity-50" />
        <div className="vignette absolute inset-0" />
        <div className="relative mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-end px-6 pb-16">
          <p className="eyebrow text-ember">Encerramento</p>
          <h1 className="font-display mt-4 text-6xl uppercase leading-[0.9] md:text-8xl">{title}</h1>
        </div>
      </section>
      <article className="mx-auto max-w-2xl space-y-6 px-6 py-20 text-xl leading-relaxed">
        {body.map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
      </article>
      <section className="mx-auto max-w-3xl px-6 pb-24 text-center">
        {FINAL.slice(0, 3).map((f) => (
          <p key={f} className="font-display text-5xl uppercase leading-tight md:text-7xl">{f}</p>
        ))}
        <p className="mt-12 font-serif text-3xl italic text-ember">É amargo. Mas cura.</p>
        <Link to="/sumario" className="eyebrow mt-16 inline-block opacity-70 hover:text-ember">Voltar ao sumário</Link>
      </section>
      <Footer />
    </main>
  );
}
