import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { acceptSession, finishGoogleSignIn } from "@/lib/account-actions";
import { AccountPage } from "@/components/account";
export const Route = createFileRoute("/auth/retorno")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: Page,
});
function Page() {
  const started = useRef(false);
  const [message, setMessage] = useState("Confirmando sua conta…");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const recovery = params.get("type") === "recovery";
    const query = new URLSearchParams(window.location.search);
    const code = query.get("code");
    const providerError = query.get("error") || params.get("error");
    window.history.replaceState(null, "", "/auth/retorno");
    if (providerError) {
      setMessage("A entrada não foi concluída. Tente novamente ou entre com e-mail e senha.");
      return;
    }
    if (code) {
      void finishGoogleSignIn({ data: { code } })
        .then((result) => {
          if (result.ok) window.location.replace("/devocional");
          else
            setMessage("A entrada com Google expirou ou não pôde ser confirmada. Tente novamente.");
        })
        .catch(() => setMessage("Não foi possível confirmar a entrada. Tente novamente."));
      return;
    }
    if (!accessToken || !refreshToken) {
      setMessage("Entre com seu e-mail e senha. Se o link expirou, solicite um novo.");
      return;
    }
    void acceptSession({ data: { accessToken, refreshToken } })
      .then((result) => {
        if (result.ok) window.location.replace(recovery ? "/nova-senha" : "/devocional");
        else setMessage("Este link não pôde ser confirmado. Solicite um novo.");
      })
      .catch(() => setMessage("Não foi possível confirmar agora. Tente novamente."));
  }, []);
  return (
    <AccountPage title="Sua conta">
      <p role="status">{message}</p>
      <Link to="/login" className="text-ember">
        Entrar
      </Link>
    </AccountPage>
  );
}
