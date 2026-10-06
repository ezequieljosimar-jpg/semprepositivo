import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { getMyAccount } from "@/lib/account-actions";
import { accessDecision } from "@/lib/accounts";
import { AccountPage, accountButton } from "@/components/account";
export const Route = createFileRoute("/pagamento-confirmado")({
  loader: async () => {
    const account = await getMyAccount();
    const decision = accessDecision(
      account?.profile.user_id ?? null,
      account?.access?.access_status ?? null,
      account?.access?.expires_at ?? null,
    );
    if (decision !== "allowed")
      throw redirect({ to: decision === "login" ? "/login" : "/acesso-negado" });
    return null;
  },
  staleTime: 0,
  component: Page,
});
function Page() {
  return (
    <AccountPage title="Seu acesso está liberado">
      <p>Você não precisa correr. Apenas continue.</p>
      <Link to="/devocional" className={accountButton}>
        Seu dia atual
      </Link>
    </AccountPage>
  );
}
