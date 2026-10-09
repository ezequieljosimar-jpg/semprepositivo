import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { getMyAccount } from "@/lib/account-actions";
import { devotionalDecision } from "@/lib/accounts";
import { AccountPage, accountButton, SampleInvitationForm } from "@/components/account";
export const Route = createFileRoute("/acesso-negado")({
  loader: async () => {
    const account = await getMyAccount();
    if (!account) throw redirect({ to: "/login" });
    if (
      devotionalDecision(
        account.profile.user_id,
        account.access?.access_status ?? null,
        account.access?.expires_at ?? null,
        account.access?.sample_granted_at,
      ) === "allowed"
    )
      throw redirect({ to: "/devocional" });
    return { invitationMessage: account.invitationMessage };
  },
  staleTime: 0,
  component: Page,
});
function Page() {
  const { invitationMessage } = Route.useLoaderData();
  return (
    <AccountPage title="Seu acesso ainda não está liberado">
      <p>
        Seu progresso permanece guardado. O conteúdo estará disponível quando seu acesso for
        confirmado.
      </p>
      <Link to="/compra" className={accountButton}>
        Quero acessar o devocional
      </Link>
      {invitationMessage && <p role="status" className="text-ember">{invitationMessage}</p>}
      <SampleInvitationForm />
      <p>
        <Link to="/minha-conta" className="text-ember">
          Minha conta
        </Link>
      </p>
    </AccountPage>
  );
}
