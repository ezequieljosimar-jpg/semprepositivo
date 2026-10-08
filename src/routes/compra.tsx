import { createFileRoute, Link } from "@tanstack/react-router";
import { AccountPage, accountButton } from "@/components/account";
export const Route = createFileRoute("/compra")({ component: Page });
function Page() {
  return (
    <AccountPage title="Uma jornada de 90 dias">
      <p>É Amargo, Mas Cura.</p>
      <p>
        Use na compra o mesmo e-mail da sua conta do Devocional. Assim que o pagamento for
        aprovado, seu acesso é liberado automaticamente.
      </p>
      <a
        href="https://pay.kiwify.com.br/VoRoa1v"
        target="_blank"
        rel="noopener noreferrer"
        className={accountButton}
      >
        Quero acessar o devocional
      </a>
      <p>
        <Link to="/login" className="text-ember">
          Já comprei · Entrar na minha conta
        </Link>
      </p>
    </AccountPage>
  );
}
