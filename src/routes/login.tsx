import { createFileRoute } from "@tanstack/react-router";
import { accountConfiguration } from "@/lib/account-actions";
import { AccountPage, AccountForm } from "@/components/account";
export const Route = createFileRoute("/login")({
  loader: () => accountConfiguration(),
  head: () => ({
    meta: [{ title: "Entrar | Sempre Positivo" }, { name: "robots", content: "noindex" }],
  }),
  component: Page,
});
function Page() {
  const { enabled } = Route.useLoaderData();
  return (
    <AccountPage title="Entrar">
      <AccountForm kind="login" enabled={enabled} />
    </AccountPage>
  );
}
