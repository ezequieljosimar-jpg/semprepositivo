type AuthFailure = { code?: string | undefined; status?: number | undefined };
export function authFailureMessage(error: AuthFailure, fallback: string) {
  switch (error.code) {
    case "email_provider_disabled":
    case "signup_disabled":
      return "O cadastro por e-mail está temporariamente indisponível. Tente novamente mais tarde.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.";
    case "weak_password":
      return "Escolha uma senha mais forte, com letras, números e símbolos.";
    case "email_address_invalid":
      return "Confira se o endereço de e-mail foi digitado corretamente.";
    case "email_not_confirmed":
      return "Confirme seu e-mail antes de entrar. Verifique também a pasta de spam.";
    default:
      return fallback;
  }
}
