import { createFileRoute } from "@tanstack/react-router";
import { accountConfiguration } from "@/lib/account-actions";
import { AccountPage, AccountForm } from "@/components/account";
export const Route = createFileRoute("/cadastro")({
  loader: () => accountConfiguration(),
  head: () => ({
    meta: [{ title: "Criar sua conta | Sempre Positivo" }, { name: "robots", content: "noindex" }],
  }),
  component: Page,
});
function Page() {
  const { enabled } = Route.useLoaderData();
  return (
    <AccountPage title="Criar sua conta">
      <AccountForm kind="signup" enabled={enabled} />
    </AccountPage>
  );
}
