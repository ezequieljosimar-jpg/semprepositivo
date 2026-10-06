import { getRequest } from "@tanstack/react-start/server";

type RuntimeRequest = Request & {
  runtime?: { cloudflare?: { env?: Record<string, unknown> } };
};

// Nitro 3 exposes Cloudflare bindings on the current request. Keep this
// request-scoped: never copy credentials into global process.env.
export function serverEnv(name: string): string | undefined {
  let request: RuntimeRequest | undefined;
  try {
    request = getRequest() as RuntimeRequest;
  } catch {
    // Unit tests and standalone Node scripts may have no active HTTP request.
  }
  const binding = request?.runtime?.cloudflare?.env?.[name];
  if (typeof binding === "string") return binding;
  return process.env[name];
}
