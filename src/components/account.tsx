import { useState, type ReactNode, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Footer, TopBar, SectionLabel } from "./book";
import {
  signIn,
  signUp,
  recoverPassword,
  updatePassword,
  googleSignInAvailable,
  acceptSession,
  stageSampleCode,
  redeemSampleCode,
} from "@/lib/account-actions";

export const accountButton =
  "font-label inline-block border border-foreground px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] transition hover:bg-foreground hover:text-background disabled:opacity-50";
export function AccountPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-2xl px-6 pt-20 animate-rise">
        <SectionLabel>Sempre Positivo</SectionLabel>
        <h1 className="font-display text-5xl uppercase leading-none md:text-6xl">{title}</h1>
        <div className="mt-10 space-y-6 text-lg leading-relaxed">{children}</div>
      </main>
      <Footer />
    </>
  );
}
export function AccountForm({
  kind,
  enabled,
}: {
  kind: "login" | "signup" | "recover" | "password";
  enabled: boolean;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [finished, setFinished] = useState(false);
  const signup = kind === "signup";
  const passwordOnly = kind === "password";
  const recover = kind === "recover";
  if (!enabled)
    return (
      <p>
        O acesso por conta está em preparação.{" "}
        <Link to="/" className="text-ember">
          Voltar ao início.
        </Link>
      </p>
    );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      const email = String(values.get("email") ?? "").trim();
      const password = String(values.get("password") ?? "");
      if (signup || kind === "login") await stageSampleCode({ data: { code } });
      const result = recover
        ? await recoverPassword({ data: { email } })
        : passwordOnly
          ? await updatePassword({ data: { password } })
          : signup
            ? await signUp({
                data: { email, password, name: String(values.get("name") ?? "").trim() },
              })
            : await signIn({ data: { email, password } });
      if (result.ok && kind === "login") {
        window.location.replace("/devocional");
        return;
      }
      setMessage("message" in result ? (result.message ?? "") + (result.ok && signup && code.trim() ? " Seu convite será verificado ao entrar com o e-mail confirmado. Guarde o código para usar novamente, se necessário." : "") : "Não foi possível entrar.");
      setFinished(result.ok && (signup || recover || passwordOnly));
    } catch {
      setMessage("Não foi possível concluir agora. Tente novamente em alguns instantes.");
    } finally {
      setBusy(false);
    }
  }
  const input =
    "mt-2 block w-full border-b border-border bg-transparent px-1 py-3 font-serif text-xl outline-none focus:border-ember";
  return (
    <>
      <form onSubmit={submit} className="space-y-6">
        {signup && (
          <label className="block eyebrow">
            Nome
            <input name="name" required autoComplete="name" maxLength={120} className={input} />
          </label>
        )}
        {!passwordOnly && (
          <label className="block eyebrow">
            E-mail
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              className={input}
            />
          </label>
        )}
        {!recover && (
          <label className="block eyebrow">
            {passwordOnly ? "Nova senha" : "Senha"}
            <input
              name="password"
              type="password"
              autoComplete={signup || passwordOnly ? "new-password" : "current-password"}
              minLength={8}
              maxLength={128}
              required
              className={input}
            />
            <span className="font-label text-xs normal-case tracking-normal text-muted-foreground">
              Pelo menos 8 caracteres.
            </span>
          </label>
        )}
        {(signup || kind === "login") && (
          <label className="block eyebrow">
            Código de convite · opcional
            <input name="sampleCode" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="off" maxLength={80} className={input} />
            <span className="font-label text-xs normal-case tracking-normal text-muted-foreground">
              Recebeu um convite? Use o código para conhecer somente o Dia 1. O cadastro sem convite não libera a amostra.
            </span>
          </label>
        )}
        <button disabled={busy || finished} className={accountButton}>
          {busy
            ? "Aguarde…"
            : signup
              ? "Criar conta"
              : recover
                ? "Enviar link"
                : passwordOnly
                  ? "Salvar senha"
                  : "Entrar"}
        </button>
        {message && (
          <p role="status" className="font-serif text-xl italic">
            {message}
          </p>
        )}
      </form>
      {(kind === "login" || signup) && (
        <button
          type="button"
          disabled={busy}
          className={accountButton}
          onClick={async () => {
            setBusy(true);
            setMessage("");
            try {
              await stageSampleCode({ data: { code } });
              const available = await googleSignInAvailable();
              if (!available.enabled) {
                setMessage("A entrada com Google não está disponível agora. Use e-mail e senha.");
                return;
              }
              const { signInManagedGoogle } = await import("@/lib/managed-google");
              const result = await signInManagedGoogle();
              if (result.redirected) return;
              if (result.error || !result.tokens) {
                setMessage("A entrada com Google não foi concluída. Tente novamente.");
                return;
              }
              const accepted = await acceptSession({ data: {
                accessToken: result.tokens.access_token,
                refreshToken: result.tokens.refresh_token,
              } });
              if (accepted.ok) window.location.replace("/devocional");
              else setMessage("Não foi possível confirmar sua conta Google. Tente novamente.");
            } catch {
              setMessage(
                "Não foi possível iniciar a entrada com Google. Use e-mail e senha ou tente novamente.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          Continuar com Google
        </button>
      )}
      <div className="flex flex-wrap gap-5 border-t border-border pt-6 text-sm">
        {kind !== "login" && (
          <Link to="/login" className="text-ember">
            Já tenho conta · Entrar
          </Link>
        )}
        {kind === "login" && (
          <>
            <Link to="/cadastro" className="text-ember">
              Criar conta
            </Link>
            <Link to="/recuperar-senha" className="text-muted-foreground">
              Esqueci minha senha
            </Link>
          </>
        )}
      </div>
    </>
  );
}

export function SampleInvitationForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return <form className="space-y-4 border-t border-border pt-6" onSubmit={async (event) => {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") ?? "").trim();
    setBusy(true); setMessage("");
    try {
      const result = await redeemSampleCode({ data: { code } });
      if (result.ok) { window.location.replace("/dia/1"); return; }
      setMessage(result.message);
    } catch { setMessage("Não foi possível verificar o convite agora. Tente novamente."); }
    finally { setBusy(false); }
  }}>
    <label className="block eyebrow">Recebeu um convite para a amostra?
      <input name="code" required maxLength={80} autoComplete="off" placeholder="Código de convite" className="mt-2 block w-full border-b border-border bg-transparent px-1 py-3 font-serif text-xl outline-none focus:border-ember" />
    </label>
    <p className="text-sm text-muted-foreground">O convite libera somente o Dia 1 na sua conta.</p>
    <button disabled={busy} className={accountButton}>{busy ? "Verificando…" : "Liberar minha amostra"}</button>
    {message && <p role="status" className="text-ember">{message}</p>}
  </form>;
}
