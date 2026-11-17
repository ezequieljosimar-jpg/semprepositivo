import { checkoutClickSchema } from "./checkout-click";

export type ClickRow = ReturnType<typeof checkoutClickSchema.parse> & { path: "/acesso" };

export async function handleCheckoutClick(request: Request, save: (row: ClickRow) => Promise<void>): Promise<Response> {
  const response = (status: number) => new Response(null, { status, headers: { "Cache-Control": "no-store" } });
  // No cross-origin ingestion; no cookies, identity or request headers are persisted.
  if (request.headers.get("origin") !== new URL(request.url).origin) return response(403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return response(415);
  if (Number(request.headers.get("content-length")) > 4096) return response(413);
  const reader = request.body?.getReader();
  if (!reader) return response(400);
  let size = 0;
  let raw = "";
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) { await reader.cancel(); return response(413); }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return response(400); }
    const parsed = checkoutClickSchema.safeParse(body);
    if (!parsed.success) return response(400);
    await save({ ...parsed.data, path: "/acesso" });
    return response(204);
  } catch { return response(503); }
}