import { createFileRoute, Link } from "@tanstack/react-router";
import { AccountPage, accountButton } from "@/components/account";
export const Route = createFileRoute("/compra")({ component: Page });
function Page() {
  return (
    <AccountPage title="Uma jornada de 90 dias">
      <p>É Amargo, Mas Cura.</p>
      <p>
        As informações de compra estarão disponíveis aqui quando a plataforma de pagamento estiver
        conectada.
      </p>
      <Link to="/login" className={accountButton}>
        Entrar na minha conta
      </Link>
    </AccountPage>
  );
}
