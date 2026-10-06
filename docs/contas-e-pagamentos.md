## Intervalo entre dias — 6 de outubro de 2026

A progressão agora exige 12 horas após a conclusão anterior. Aplicar também `supabase/migrations/20261006230000_twelve_hour_progression.sql`. A alteração preserva autenticação, acesso ao produto, tabelas, conclusões existentes e conteúdo. Consulte `docs/progressao.md`.

## Revisão da autenticação — 6 de outubro de 2026

A causa do cadastro recusado era o provedor de e-mail desativado no Cloud. Ele agora está habilitado, com confirmação obrigatória. A conta real do proprietário foi confirmada e o banco registra login. Cadastro continua criando acesso `pending`; a conta do proprietário recebeu liberação manual para testes, sem registrar compra.

Esta revisão mantém os componentes e as tabelas existentes. Melhora as mensagens de autenticação, exige nome no cadastro, explica corretamente o próximo passo quando a confirmação de e-mail está habilitada ou desabilitada, preserva o cookie criptografado HttpOnly e garante sua limpeza mesmo se a revogação remota falhar. A página de acesso pendente usa o botão “Quero acessar o devocional”, levando à página informativa existente, sem checkout.

O botão “Continuar com Google” consulta `/auth/v1/settings` no servidor e só inicia `signInWithOAuth` se o provedor real estiver habilitado. O callback usa PKCE: o verificador fica no cookie criptografado HttpOnly, a troca do código e a validação de identidade acontecem no servidor. Não há Client Secret no frontend, credenciais inventadas ou concessão de acesso ao produto pelo OAuth. Se o provedor estiver desligado ou sua configuração não puder ser consultada, o botão explica o motivo e oferece e-mail/senha.

**Google ainda desativado em produção.** Em More → Cloud → Users → Auth settings → Google, falta habilitar o método e selecionar a configuração. O Cloud oferece “Managed by Lovable”, que dispensa Client ID/Secret próprios. Se for escolhido “Your own credentials”, configurar no Google Cloud um cliente OAuth do tipo Web application e a tela de consentimento; salvar Client ID e Client Secret no painel seguro do provedor; cadastrar exatamente as URIs de retorno mostradas pelo painel no Google Cloud. No Auth, permitir também `https://semprepositivo.lovable.app/auth/retorno` como destino da aplicação. Não confundir essa URL de retorno da aplicação com o callback do provedor exibido no painel. Referências: https://docs.lovable.dev/features/google-auth e https://supabase.com/docs/guides/auth/social-login/auth-google.

Validação desta revisão: testes unitários e PostgreSQL isolado, SDK real do Supabase com respostas de Auth isoladas e teste HTTP com cookies reais da aplicação (`node scripts/test-auth-session.mjs`). O teste HTTP cobre cadastro, confirmação obrigatória, login, atualização, persistência após reinício do processo, acesso pendente, acesso ativo, dia futuro bloqueado, saída e nova entrada. `node scripts/test-journey.mjs` cobre a progressão protegida; a regra atual de 12 horas e suas verificações estão em `docs/progressao.md`. O teste isolado não envia e-mails nem cria contas no serviço de produção. Cadastro, confirmação e login reais do proprietário foram corroborados no banco; Google real depende da ativação/configuração e não foi declarado validado.

Para pagamentos: escolher o provedor e o produto; configurar credenciais no servidor; implementar o endpoint e o adaptador com verificação de assinatura, identificação do comprador e idempotência; mapear aprovação, reembolso, cancelamento e chargeback para o acesso. Nada disso é ativado nesta revisão.

---

## Atualização: telas de conta e banco conectado

O Supabase real do projeto foi habilitado e a migração foi aplicada em 6 de outubro de 2026 (UTC). As cinco tabelas têm RLS; a verificação em produção confirmou que authenticated não pode atualizar access_status, inserir conclusões diretamente ou executar o contrato de pagamentos.

As rotas /login, /cadastro, /minha-conta, /devocional, /compra, /acesso-negado e /pagamento-confirmado agora existem, reutilizando a identidade visual. Também existem /recuperar-senha, /nova-senha e /auth/retorno. /pagamento-confirmado verifica acesso real antes de renderizar; não afirma que ocorreu um pagamento. /compra informa que a plataforma ainda será conectada e não cria checkout.

O modo padrão agora é accounts. Sem PROGRESS_SESSION_SECRET válido, o site público continua abrindo, as telas de autenticação informam preparação e o conteúdo protegido redireciona para login. Nenhum acesso é concedido automaticamente. Com o segredo, as contas funcionam usando SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY provisionados pelo Lovable. O segredo deve ter pelo menos 32 caracteres, ser aleatório e ser salvo exclusivamente no gerenciador de segredos do projeto, nunca no GitHub ou com prefixo VITE_.

Configuração pelo proprietário: More → Cloud → Secrets → Add secret, nome PROGRESS_SESSION_SECRET, valor aleatório de 32 bytes em base64. Não alterar os valores SUPABASE_ gerenciados. DEVOCIONAL_SITE_URL é opcional e tem como padrão https://semprepositivo.lovable.app. No painel Auth, verificar confirmação de e-mail, Site URL e permitir https://semprepositivo.lovable.app/auth/retorno como URL de redirecionamento. O callback aceita a sessão recebida por fragmento, remove tokens da URL e valida identidade e e-mail no servidor antes de salvar o cookie HttpOnly. Não guarda tokens de conta no localStorage.

Login e logout usam navegação completa para remover caches da conta anterior. Respostas escritas continuam locais e separadas por usuário; o progresso e a autorização são persistidos no banco.

A implementação foi validada localmente com build, TypeScript, testes isolados de Auth e PostgreSQL. O envio real de e-mails e o ciclo de login em produção ainda exigem o segredo e uma conta real do proprietário. Não foram criados usuários, compras ou pagamentos fictícios.

A seção histórica abaixo descreve a preparação inicial; o estado atual é o descrito nesta atualização.

# Contas, acesso ao produto e pagamentos futuros

## Estado desta entrega

A arquitetura está preparada em código e em uma migração SQL, sem configurar serviços de produção, criar usuários reais, expor webhook, escolher checkout ou cobrar alguém. As páginas, imagens, estilos e os textos dos 90 dias não foram redesenhados.

Como não existia banco nem autenticação no projeto, foi preparado um adaptador para **Supabase Auth + PostgreSQL**. A plataforma de pagamento continua independente. A base anterior de progressão é reaproveitada.

`DEVOCIONAL_ACCESS_MODE=anonymous` mantém a progressão anônima anterior. `accounts` ativa a autorização por conta e o progresso no banco, sem recorrer ao cookie anônimo como autorização alternativa. Não ative `accounts` antes de configurar os serviços, aplicar a migração e conectar as telas de conta.

## Estrutura criada

| Estrutura | Responsabilidade |
| --- | --- |
| `devotional_profiles` | ID de Auth, nome, e-mail, criação e última atividade |
| `devotional_access` | `pending`, `active`, `expired`, `cancelled`, início e expiração opcional |
| `devotional_day_completions` | `user_id`, `day_number`, `completed_at`, sem duplicações |
| `devotional_payment_orders` | Estado por pedido e `payment_provider` |
| `devotional_payment_events` | Auditoria e deduplicação de eventos verificados |

A migração cria perfis apenas a partir de contas reais de `auth.users`, inicialmente com acesso `pending`. Ela não insere compradores fictícios nem concede acesso no cadastro. O perfil e o progresso são devolvidos por `getMyAccount` para a futura página de conta.

## Autorização e progresso

- A identidade é verificada pelo Supabase Auth no servidor; um ID enviado pelo navegador não é usado para autorizar.
- Tokens ficam em sessão criptografada HttpOnly. Nenhuma chave administrativa ou token é devolvido pelos serviços de conta.
- No modo de contas, `readDay`, `readClosing` e `completeDay` exigem identidade verificada e acesso ativo, inclusive por URL ou função de servidor.
- Usuários sem login são direcionados para `/login`; usuários sem acesso ativo, para `/acesso-negado`.
- A função transacional de conclusão usa `auth.uid()`, sem receber `user_id`. Ela bloqueia a linha da conta, valida o acesso e registra somente o próximo dia (ou uma conclusão já existente).
- As políticas RLS isolam os registros. Clientes não podem inserir conclusões diretamente, apagá-las ou escrever status de acesso. Apenas o próprio nome é editável no perfil.
- O progresso pertence ao banco, não ao localStorage nem à sessão. Encerrar a sessão não apaga conclusões.
- Não existe prazo diário, punição por ausência ou reset da jornada. `expires_at`, se utilizado no futuro, é um prazo de direito de acesso ao produto, não uma regra dos 90 dias.
- A revogação de acesso não apaga o histórico; uma nova concessão permite continuar do mesmo ponto.
- O cache e as respostas escritas no navegador usam namespace por usuário no modo de contas. As respostas permanecem uma melhoria local de experiência; não autorizam acesso e ainda não sincronizam entre dispositivos.
- O histórico anônimo anterior permanece separado. Uma conta nova começa no Dia 1; não há importação automática de marcadores antigos locais.

## Páginas futuras

Os caminhos `/login`, `/cadastro`, `/minha-conta`, `/devocional`, `/compra`, `/acesso-negado` e `/pagamento-confirmado` estão definidos em `accounts.ts`. **Não foram criadas novas telas nem páginas fictícias de compra.**

Antes de ativar o modo de contas, conectar as telas necessárias às funções `signIn`, `signUp`, `signOut`, `getMyAccount` e à jornada existente, reaproveitando o design. Login/cadastro devem invalidar o contexto do roteador; logout deve limpar o cache de consultas e invalidar o roteador. `/devocional` deve continuar no dia indicado pelo banco. `/pagamento-confirmado` deve consultar o acesso real; visitar essa URL nunca concede acesso.

## Integração futura de pagamento

Não existe endpoint público de webhook nesta entrega. `processVerifiedNotification` é um contrato interno e exige:

1. Um adaptador explicitamente configurado para o `payment_provider`.
2. Verificação da assinatura sobre o corpo bruto recebido e os cabeçalhos, antes de normalizar os dados.
3. Mapeamento dos eventos reais da plataforma para o contrato canônico.
4. Resolução segura do comprador em uma conta de Auth. Validar a identidade de compra e o e-mail; definir o fluxo de convite/cadastro e confirmação de e-mail antes de vincular um usuário. Nunca aceitar `user_id` de uma chamada do navegador nem vincular apenas por metadados de cadastro.
5. Aplicação transacional através da chave administrativa exclusivamente no servidor.

O contrato suporta aprovação, cancelamento, reembolso, chargeback, cancelamento de assinatura e expiração. Não cria uma assinatura. A política de quando uma assinatura cancelada perde acesso deverá ser definida na integração real.

A função SQL de aplicação evita eventos duplicados e que eventos antigos reativem um pedido já revogado. Um reembolso de um pedido não retira acesso concedido por outro pedido ainda válido. O histórico de leitura não é removido. Retentativas, filas, resolução de compradores ainda sem conta e assinatura específica do provedor serão implementadas quando a plataforma for escolhida.

## O que configurar na ativação

1. Conectar o Supabase real ao ambiente do projeto e aplicar `supabase/migrations/20261006023000_accounts_and_access.sql`.
2. Configurar no servidor `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` e `PROGRESS_SESSION_SECRET`. Nunca usar prefixo `VITE_` para segredos. Manter a chave da sessão estável entre versões.
3. Configurar confirmação de e-mail, URLs reais de redirecionamento, envio de e-mails e limites de Auth. Conectar as telas de conta preservando a identidade visual.
4. Testar o fluxo de ponta a ponta com contas reais de teste no ambiente de homologação. Depois, mudar `DEVOCIONAL_ACCESS_MODE` para `accounts`.
5. Quando escolher a plataforma, definir checkout/página de venda reais, produto, política de acesso, segredo de webhook, verificador, eventos, identificação do comprador, retentativas e envio de convite. Somente então cadastrar `SUPABASE_SERVICE_ROLE_KEY` no servidor do processador e criar o endpoint de webhook configurado.

## Testes executáveis

```sh
npm install
npx tsc --noEmit
npm test
npm run build
node scripts/test-journey.mjs
```

Os testes de banco executam a migração em PostgreSQL local isolado (PGlite), com identidades exclusivamente de teste e primitivas locais equivalentes às de Auth. Cobrem os 13 cenários de isolamento/progressão, permissões e persistência após fechar/reabrir o banco. Testes do adaptador verificam login exigido, acesso negado, validação de identidade e rejeição de dados de outra conta. O teste HTTP confirma que URLs de leitura exigem login no modo de contas.

Esses testes não configuram Supabase de produção, não criam contas reais, não simulam checkout nem fazem pagamentos. Login/e-mails e webhooks reais ainda dependem da configuração e da homologação futuras.
