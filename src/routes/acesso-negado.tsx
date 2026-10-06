import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { getMyAccount } from "@/lib/account-actions";
import { accessDecision } from "@/lib/accounts";
import { AccountPage, accountButton } from "@/components/account";
export const Route = createFileRoute("/acesso-negado")({
  loader: async () => {
    const account = await getMyAccount();
    if (!account) throw redirect({ to: "/login" });
    if (
      accessDecision(
        account.profile.user_id,
        account.access?.access_status ?? null,
        account.access?.expires_at ?? null,
      ) === "allowed"
    )
      throw redirect({ to: "/devocional" });
    return null;
  },
  staleTime: 0,
  component: Page,
});
function Page() {
  return (
    <AccountPage title="Seu acesso ainda não está liberado">
      <p>
        Seu progresso permanece guardado. O conteúdo estará disponível quando seu acesso for
        confirmado.
      </p>
      <Link to="/compra" className={accountButton}>
        Sobre o acesso
      </Link>
      <p>
        <Link to="/minha-conta" className="text-ember">
          Minha conta
        </Link>
      </p>
    </AccountPage>
  );
}
