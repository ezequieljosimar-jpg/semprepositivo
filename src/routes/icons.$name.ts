import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/icons/$name")({
  server: { handlers: { GET: async ({ params }) => {
    const { appIcons } = await import("@/lib/app-icons.server");
    const encoded = Object.prototype.hasOwnProperty.call(appIcons, params.name) ? appIcons[params.name] : undefined;
    if (!encoded) return new Response("Not found", {status:404});
    const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
    return new Response(bytes.buffer, {headers:{"Content-Type":"image/png","Cache-Control":"public, max-age=3600","X-Content-Type-Options":"nosniff"}});
  } } }
});
