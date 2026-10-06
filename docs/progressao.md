# Ativação da progressão guiada

A implementação reutiliza TanStack Start, TanStack Query, os componentes e as rotas existentes. No modo anônimo, o progresso fica em uma sessão criptografada e assinada, persistida em cookie HttpOnly no mesmo navegador. A arquitetura de contas e banco está preparada separadamente, ainda sem serviço de produção configurado; consulte `docs/contas-e-pagamentos.md` antes de ativá-la.

## Configuração necessária

1. Gere uma chave com `openssl rand -hex 32`.
2. Cadastre o valor como `PROGRESS_SESSION_SECRET` nos ambientes **de servidor** de preview e produção do Lovable. Não use prefixo `VITE_`.
3. Mantenha a mesma chave entre versões e reinícios. Não publique a chave em código, commits ou mensagens. Trocar a chave invalida as sessões existentes.
4. Depois de configurar, incorpore a branch e atualize a publicação.

Sem essa configuração, o servidor rejeita o acesso em vez de usar uma chave insegura ou liberar conteúdo. Por isso, esta alteração deve permanecer em uma branch de revisão até a configuração estar pronta.

## Comportamento

- Dia 1 inicialmente disponível. Concluir explicitamente libera somente o próximo.
- Conclusões são idempotentes; não há ação de desfazer que bloqueie dias anteriores.
- Nenhuma regra utiliza data, sequência diária, contagem regressiva ou faltas.
- As respostas escritas continuam nos mesmos registros de localStorage.
- O catálogo enviado ao navegador contém somente títulos e fases. O servidor valida a sessão antes de retornar o texto de um dia ou o encerramento.
- Respostas personalizadas usam `Cache-Control: private, no-store`.
- O cookie persiste após fechar o navegador. Limpar os dados do site, usar outro navegador/dispositivo ou perder o cookie perde a identificação anônima. Navegadores também podem limitar a duração dos cookies; para recuperação e sincronização entre dispositivos será necessária uma conta com armazenamento em banco.
- Os antigos marcadores livres de localStorage não autorizam acesso no servidor. Eles não são importados automaticamente como conclusões confiáveis. As respostas antigas não são apagadas.

`progress-session.server.ts` é o ponto de persistência. Com `DEVOCIONAL_ACCESS_MODE=accounts`, ele seleciona o adaptador de conta e usa funções transacionais do banco vinculadas ao usuário autenticado. Sem essa ativação, mantém o comportamento anônimo anterior.

## Verificação

```sh
npm install
npx tsc --noEmit
npm test
npm run build
node scripts/test-journey.mjs
```

O teste HTTP cria uma chave apenas para testes, inicia o servidor, verifica bloqueio das rotas e das funções de servidor, tenta adulterar o cookie, reinicia o servidor com a mesma chave e conclui os 90 dias. Não utiliza dados de visitantes reais.
