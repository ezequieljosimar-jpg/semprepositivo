export type AccessStatus = "pending" | "active" | "expired" | "cancelled";
export const ACCOUNT_PATHS = {
  login: "/login",
  signup: "/cadastro",
  profile: "/minha-conta",
  devotional: "/devocional",
  purchase: "/compra",
  denied: "/acesso-negado",
  confirmed: "/pagamento-confirmado",
} as const;

export function accessDecision(
  userId: string | null,
  status: AccessStatus | null,
  expiresAt: string | null,
  now = Date.now(),
) {
  if (!userId) return "login" as const;
  if (
    status !== "active" ||
    (expiresAt !== null &&
      (!Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= now))
  )
    return "denied" as const;
  return "allowed" as const;
}
