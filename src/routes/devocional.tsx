import { createFileRoute, redirect } from "@tanstack/react-router";
import { getMyAccount, accountConfiguration } from "@/lib/account-actions";
import { devotionalDecision } from "@/lib/accounts";
import { getProgress } from "@/lib/journey";
export const Route = createFileRoute("/devocional")({
  beforeLoad: async () => {
    const config = await accountConfiguration();
    if (config.enabled) {
      const account = await getMyAccount();
      const decision = devotionalDecision(
        account?.profile.user_id ?? null,
        account?.access?.access_status ?? null,
        account?.access?.expires_at ?? null,
        account?.access?.sample_granted_at,
      );
      if (decision !== "allowed")
        throw redirect({ to: decision === "login" ? "/login" : "/acesso-negado" });
    }
    const progress = await getProgress();
    throw redirect({ to: "/dia/$n", params: { n: String(progress.maxReadableDay === 1 ? 1 : (progress.currentDay ?? 90)) } });
  },
});
