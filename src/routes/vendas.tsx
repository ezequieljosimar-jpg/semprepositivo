import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/vendas")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: `/acesso${location.searchStr}${location.hash ? `#${location.hash}` : ""}`, statusCode: 301 });
  },
});
