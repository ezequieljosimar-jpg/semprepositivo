import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { acceptSession } from "@/lib/account-actions";
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
    window.history.replaceState(null, "", "/auth/retorno");
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
