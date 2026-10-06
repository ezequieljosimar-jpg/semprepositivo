import { createFileRoute } from "@tanstack/react-router";
import { accountConfiguration } from "@/lib/account-actions";
import { AccountPage, AccountForm } from "@/components/account";
export const Route = createFileRoute("/recuperar-senha")({
  loader: () => accountConfiguration(),
  head: () => ({
    meta: [{ title: "Recuperar senha | Sempre Positivo" }, { name: "robots", content: "noindex" }],
  }),
  component: Page,
});
function Page() {
  const { enabled } = Route.useLoaderData();
  return (
    <AccountPage title="Recuperar senha">
      <AccountForm kind="recover" enabled={enabled} />
    </AccountPage>
  );
}
