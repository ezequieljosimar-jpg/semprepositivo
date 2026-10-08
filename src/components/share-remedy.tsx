import { useState } from "react";
import { Copy, Share2 } from "lucide-react";

const publicUrl = "https://semprepositivo.lovable.app";
const title = "Devocional Sempre Positivo — É Amargo, Mas Cura";

// Receives only the remedy returned by the existing authorized day loader.
export function ShareRemedy({ remedy }: { remedy: string[] }) {
  const [options, setOptions] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [manualCopy, setManualCopy] = useState(false);
  const text = `O remédio\n\n${remedy.join("\n\n")}\n\n${title}\n${publicUrl}`;
  const buttonClass = "font-label inline-flex items-center justify-center gap-2 border border-foreground/30 px-4 py-3 text-xs uppercase tracking-[0.12em] transition hover:border-ember hover:text-ember focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ember";

  async function share() {
    setNotice("");
    if (!navigator.share) {
      setOptions((open) => !open);
      return;
    }
    setBusy(true);
    try {
      await navigator.share({ title, text });
    } catch (error) {
      // Closing the device's share sheet is an ordinary user action.
      if (!(typeof error === "object" && error !== null && "name" in error && error.name === "AbortError")) {
        setOptions(true);
        setNotice("Escolha abaixo outra forma de compartilhar.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setManualCopy(false);
      setNotice("Remédio copiado. Cole onde quiser compartilhar.");
    } catch {
      setManualCopy(true);
      setNotice("Selecione e copie o texto abaixo para compartilhar.");
    }
  }

  return (
    <div className="mt-6">
      <button type="button" onClick={share} disabled={busy} aria-expanded={options} className={`${buttonClass} disabled:opacity-60`}>
        <Share2 size={16} aria-hidden="true" />
        Compartilhar o remédio
      </button>
      {options && (
        <div className="mt-3 flex flex-wrap gap-3">
          <button type="button" onClick={copy} className={buttonClass}>
            <Copy size={15} aria-hidden="true" /> Copiar o remédio
          </button>
          <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className={buttonClass}>
            Compartilhar pelo WhatsApp
          </a>
        </div>
      )}
      <p role="status" aria-live="polite" className="mt-3 text-sm text-muted-foreground">{notice}</p>
      {manualCopy && (
        <textarea aria-label="Remédio para copiar" readOnly value={text} rows={8} onFocus={(event) => event.currentTarget.select()} className="mt-2 w-full border border-border bg-background p-3 text-base" />
      )}
    </div>
  );
}
