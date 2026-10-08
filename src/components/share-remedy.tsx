import { useEffect, useState } from "react";
import { Copy, Download, Share2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { createRemedyCard } from "@/lib/remedy-card";

const publicUrl = "https://semprepositivo.lovable.app";
const shareCaption = `Conheça o Devocional Sempre Positivo — É Amargo, Mas Cura.\n${publicUrl}`;

export function ShareRemedy({ remedy }: { remedy: string[] }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const buttonClass = "font-label inline-flex items-center justify-center gap-2 border border-foreground/30 px-4 py-3 text-xs uppercase tracking-[0.12em] transition hover:border-ember hover:text-ember focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ember disabled:opacity-60";

  async function prepare() {
    setOpen(true); setNotice(""); setBusy(true); setFile(null); setPreview("");
    try { setFile(await createRemedyCard(remedy)); }
    catch { setNotice("Não foi possível preparar a imagem. Feche e tente novamente."); }
    finally { setBusy(false); }
  }
  async function share() {
    if (!file) return;
    setNotice("");
    if (!navigator.share || !navigator.canShare?.({ files: [file], text: shareCaption })) {
      setNotice("Baixe a imagem e envie pelo WhatsApp ou publique nas suas redes."); return;
    }
    setBusy(true);
    try {
      // The file is already prepared: preserve the user's tap for native sharing.
      await navigator.share({ files: [file], title: "O remédio — Sempre Positivo", text: shareCaption });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setNotice("Não foi possível compartilhar. Você pode baixar a imagem abaixo.");
      }
    } finally { setBusy(false); }
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(publicUrl); setNotice("Link copiado. Você pode colá-lo na legenda ou enviar junto com a imagem."); }
    catch { setNotice(`Copie este link para enviar junto com a imagem: ${publicUrl}`); }
  }
  return <div className="mt-6">
    <button type="button" onClick={prepare} className={buttonClass}><Share2 size={16} aria-hidden="true" />Compartilhar o remédio</button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[92svh] w-[calc(100%-2rem)] overflow-y-auto">
        <DialogTitle>Compartilhar o remédio</DialogTitle>
        <DialogDescription>Compartilhe a imagem com o link para conhecer o devocional.</DialogDescription>
        {preview && <img src={preview} alt={`O remédio: ${remedy.join(" ")}`} className="mx-auto max-h-[58svh] w-auto max-w-full" />}
        {busy && !file && <p role="status">Preparando sua imagem…</p>}
        {file && preview && <div className="flex flex-wrap gap-3">
          <button type="button" onClick={share} disabled={busy} className={buttonClass}><Share2 size={16} aria-hidden="true" />Compartilhar imagem</button>
          <button type="button" onClick={copyLink} className={buttonClass}><Copy size={16} aria-hidden="true" />Copiar link do site</button>
          <a href={preview} download={file.name} className={buttonClass}><Download size={16} aria-hidden="true" />Baixar imagem</a>
        </div>}
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">{notice}</p>
      </DialogContent>
    </Dialog>
  </div>;
}
