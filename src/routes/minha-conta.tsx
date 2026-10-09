import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { getMyAccount, signOut } from "@/lib/account-actions";
import { AccountPage, accountButton, SampleInvitationForm } from "@/components/account";
import { useState } from "react";
export const Route = createFileRoute("/minha-conta")({
  loader: async () => {
    const account = await getMyAccount();
    if (!account) throw redirect({ to: "/login" });
    return account;
  },
  staleTime: 0,
  preloadStaleTime: 0,
  component: Page,
});
const labels = {
  pending: "Aguardando liberação",
  active: "Ativo",
  expired: "Expirado",
  cancelled: "Cancelado",
};
function Page() {
  const account = Route.useLoaderData();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <AccountPage title="Minha conta">
      <p>{account.profile.name || "Sua jornada"}</p>
      <p className="text-muted-foreground">{account.profile.email}</p>
      <p>Acesso: {account.access?.access_status === "pending" && account.access?.sample_granted_at ? "Amostra · somente Dia 1" : labels[account.access?.access_status ?? "pending"]}</p>
      <p>{account.progress.completed} de 90 dias concluídos.</p>
      <Link to="/devocional" className={accountButton}>
        Seu dia atual
      </Link>
      {account.access?.access_status === "pending" && !account.access?.sample_granted_at && <SampleInvitationForm />}
      <div>
        <button
          disabled={busy}
          className={accountButton}
          onClick={async () => {
            setBusy(true);
            try {
              await signOut();
              window.location.replace("/login");
            } catch {
              setError("Não foi possível sair. Tente novamente.");
              setBusy(false);
            }
          }}
        >
          {busy ? "Aguarde…" : "Sair da conta"}
        </button>
        {error && <p role="alert">{error}</p>}
      </div>
    </AccountPage>
  );
}
