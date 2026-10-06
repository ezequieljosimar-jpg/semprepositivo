import { createFileRoute } from "@tanstack/react-router";
import { accountConfiguration } from "@/lib/account-actions";
import { AccountPage, AccountForm } from "@/components/account";
export const Route = createFileRoute("/nova-senha")({
  loader: () => accountConfiguration(),
  head: () => ({
    meta: [{ title: "Nova senha | Sempre Positivo" }, { name: "robots", content: "noindex" }],
  }),
  component: Page,
});
function Page() {
  const { enabled } = Route.useLoaderData();
  return (
    <AccountPage title="Nova senha">
      <AccountForm kind="password" enabled={enabled} />
    </AccountPage>
  );
}
