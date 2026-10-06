import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useJourney } from "@/hooks/use-journey";

export function Footer({ page }: { page?: string | number }) {
  return (
    <footer className="mx-auto mt-24 flex max-w-3xl items-center justify-between border-t border-border px-6 py-6 text-muted-foreground">
      <span className="eyebrow !tracking-[0.25em] !text-[0.6rem]">
        Devocional Sempre Positivo — É amargo, mas cura.
      </span>
      {page !== undefined && <span className="font-label text-xs tabular-nums">{page}</span>}
    </footer>
  );
}

export function TopBar({ children }: { children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link to="/" className="font-display text-base uppercase">
          Sempre Positivo<span className="text-ember">.</span>
        </Link>
        <div className="flex items-center gap-5">
          {children}
          <Link to="/minha-conta" className="eyebrow text-muted-foreground hover:text-ember">
            Conta
          </Link>
          <Link to="/sumario" className="eyebrow text-muted-foreground hover:text-ember">
            Sumário
          </Link>
        </div>
      </div>
    </header>
  );
}

export function Rule({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="h-px flex-1 bg-border" />
      <span className="h-1.5 w-1.5 rotate-45 bg-ember" />
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-6 flex items-center gap-4">
      <span className="h-px w-8 bg-ember" />
      <h3 className="eyebrow text-ember">{children}</h3>
    </div>
  );
}

const KEY = "sempre-positivo:";

export function useStored(key: string) {
  const { ownerId } = useJourney();
  const scopedKey = ownerId === undefined ? KEY + key : `${KEY}${ownerId ?? "guest"}:${key}`;
  const [saved, setSaved] = useState({ key: scopedKey, value: "" });
  useEffect(() => {
    setSaved({ key: scopedKey, value: localStorage.getItem(scopedKey) ?? "" });
  }, [scopedKey]);
  const update = (v: string) => {
    setSaved({ key: scopedKey, value: v });
    localStorage.setItem(scopedKey, v);
  };
  const value = saved.key === scopedKey ? saved.value : "";
  return [value, update] as const;
}

export { useJourney as useDone } from "@/hooks/use-journey";

export function WriteArea({
  storageKey,
  lines,
  label,
}: {
  storageKey: string;
  lines: number;
  label?: string | undefined;
}) {
  const [v, set] = useStored(storageKey);
  return (
    <div className="flex gap-3">
      {label && <span className="font-display pt-1 text-lg text-ember">{label}</span>}
      <textarea
        value={v}
        onChange={(e) => set(e.target.value)}
        rows={Math.max(lines, 2)}
        aria-label={label ? `Resposta ${label}` : "Sua resposta"}
        placeholder="Escreva aqui…"
        className="write-lines w-full resize-y bg-transparent font-serif text-xl italic text-foreground outline-none placeholder:text-muted-foreground/50"
      />
    </div>
  );
}

export const pad = (n: number) => String(n).padStart(2, "0");
