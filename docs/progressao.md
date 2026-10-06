# Progressão guiada com intervalo de 12 horas

O projeto reutiliza TanStack Start, TanStack Query, as páginas e os componentes existentes. Em produção, Supabase Auth identifica a conta e PostgreSQL armazena o progresso. Cadastro não libera o produto: a conta precisa de acesso `active`. O conteúdo dos 90 dias permanece no servidor.

## Regra

- Dia 1 disponível para uma conta autorizada sem conclusões.
- Clicar em “Concluir este dia” salva o horário no servidor. O próximo dia permanece bloqueado durante 12 horas e abre a partir desse horário mais 12 horas.
- Ler ou abrir a página, sem concluir, não inicia o prazo. Não é possível comprovar a leitura; a conclusão é a declaração do leitor.
- Somente um próximo dia pode ficar disponível. Tempo decorrido não conclui dias nem acumula liberações.
- Dias concluídos continuam disponíveis. Repetir uma conclusão preserva seu horário e não reinicia a espera.
- O Dia 90 libera o encerramento imediatamente ao ser concluído.
- As conclusões existentes são preservadas e seus horários já salvos passam a definir o prazo.
- A página exibe o tempo restante usando o estilo existente. O relógio do dispositivo serve apenas para a indicação visual; o servidor decide o acesso e o banco decide se pode registrar a próxima conclusão.

## Segurança e persistência

Aplicar as migrações em ordem:

1. `supabase/migrations/20261006023000_accounts_and_access.sql`
2. `supabase/migrations/20261006230000_twelve_hour_progression.sql`

A segunda migração substitui as funções de progresso e conclusão sem duplicar tabelas nem alterar registros. A função de conclusão serializa operações por usuário e usa o relógio do banco. Usuários não podem inserir, alterar ou apagar conclusões diretamente, nem alterar seu acesso ao produto. O servidor verifica `nextAvailableAt` antes de retornar qualquer conteúdo protegido. Parâmetros da URL, localStorage e horário do dispositivo não autorizam leitura.

Sessões persistem no cookie criptografado HttpOnly. A chave `PROGRESS_SESSION_SECRET` deve ser estável, somente no servidor e ter ao menos 32 caracteres. No modo anônimo de compatibilidade, o mesmo intervalo fica no cookie autenticado. Respostas personalizadas usam `Cache-Control: private, no-store`. As respostas escritas permanecem nos registros existentes.

## Verificação

```sh
npm test
npx tsc --noEmit
npm run build
node scripts/test-journey.mjs
node scripts/test-auth-session.mjs
```

Os testes unitários cobrem o limite exato de 12 horas e os 90 dias em sequência. PostgreSQL isolado executa as migrações reais, nega conclusão antes do prazo e alteração de horário pelo usuário, libera após o prazo e preserva idempotência, isolamento e progresso após reinício. Os testes HTTP da aplicação negam leitura direta e chamadas de servidor durante a espera; mantêm o prazo após atualização/reinício e ignoram parâmetros falsos de liberação. Não usam credenciais, compras ou contas de produção.
