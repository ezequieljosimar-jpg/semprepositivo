import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{outcome: "accepted" | "dismissed"}> };
const DISMISSED = "devocional-install-dismissed";
export function PwaRegistration() {
  useEffect(() => {
    if (!window.isSecureContext || !("serviceWorker" in navigator) || window.top !== window.self) return;
    const host = location.hostname;
    if (host.includes("id-preview--") || host === "localhost" || host === "127.0.0.1") return;
    navigator.serviceWorker.register("/devocional-sw.js", {scope:"/", updateViaCache:"none"}).catch(() => {});
  }, []);
  return null;
}
export function InstallDevocional({ prominent = false }: { prominent?: boolean }) {
  const [ready, setReady] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    setReady(true);
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    const media = window.matchMedia("(display-mode: standalone)");
    const update = () => setInstalled(media.matches || !!(navigator as Navigator & {standalone?: boolean}).standalone);
    update(); media.addEventListener("change", update);
    try { setDismissed(Date.now() - Number(localStorage.getItem(DISMISSED) || 0) < 7*24*60*60*1000); } catch {}
    const capture = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent); };
    const done = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener("beforeinstallprompt",capture); window.addEventListener("appinstalled",done);
    return () => {media.removeEventListener("change",update);window.removeEventListener("beforeinstallprompt",capture);window.removeEventListener("appinstalled",done);};
  }, []);
  if (!ready || (!prominent && (installed || dismissed))) return null;
  if (installed) return <p className="text-sm text-muted-foreground">Devocional instalado neste celular.</p>;
  const buttonClass = "inline-flex items-center justify-center gap-2 rounded border border-ember/60 px-4 py-3 text-sm font-label hover:border-ember";
  return <div className="space-y-3">
    <div className="flex items-center gap-2">
      {prompt ? <button className={buttonClass} disabled={busy} onClick={async () => {
        setBusy(true); setMessage("");
        try { await prompt.prompt(); const choice = await prompt.userChoice; setPrompt(null); if (choice.outcome === "dismissed") setMessage("Você pode instalar depois pelo menu do navegador."); }
        catch { setMessage("Abra o menu do navegador e procure Instalar aplicativo ou Adicionar à tela inicial."); }
        finally {setBusy(false);}
      }}><Download size={16}/>{busy ? "Aguarde…" : "Instalar devocional"}</button> : <Dialog>
        <DialogTrigger asChild><button className={buttonClass}><Download size={16}/>Instalar devocional</button></DialogTrigger>
        <DialogContent><DialogHeader><DialogTitle>Seu devocional na tela do celular</DialogTitle><DialogDescription>Instale para abrir sua jornada pelo ícone, sem precisar procurar o endereço.</DialogDescription></DialogHeader>
          {ios ? <ol className="list-decimal space-y-3 pl-5 text-sm"><li>Abra esta página no Safari.</li><li>Toque em Compartilhar <Share className="inline" size={16}/> e escolha “Adicionar à Tela de Início”.</li><li>Se aparecer “Abrir como app”, deixe ativado. Toque em “Adicionar”.</li><li>Abra o ícone e entre na sua conta. Seu progresso continua ligado à mesma conta.</li></ol> : <div className="space-y-3 text-sm"><p>No Android, abra este site no Chrome e procure “Instalar aplicativo” ou “Adicionar à tela inicial” no menu ⋮.</p><p>Se estiver dentro do Instagram ou WhatsApp, primeiro escolha abrir no navegador externo.</p><p>Se a opção não aparecer, seu navegador pode não oferecer instalação. Você pode continuar lendo pelo site.</p></div>}
          <p className="text-xs text-muted-foreground">É necessário ter internet para ler o conteúdo e sincronizar seu progresso.</p>
        </DialogContent>
      </Dialog>}
      {!prominent && <button aria-label="Lembrar da instalação depois" className="p-2 opacity-60 hover:opacity-100" onClick={() => {setDismissed(true);try {localStorage.setItem(DISMISSED,String(Date.now()));} catch {}}}><X size={16}/></button>}
    </div>
    {message && <p role="status" className="text-sm">{message}</p>}
  </div>;
}
