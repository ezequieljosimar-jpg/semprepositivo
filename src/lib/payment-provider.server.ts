import { z } from "zod";

const normalizedEvent = z
  .object({
    payment_provider: z.string().trim().min(1).max(100),
    event_id: z.string().min(1).max(200),
    order_id: z.string().min(1).max(200),
    event_type: z.enum([
      "purchase.approved",
      "payment.approved",
      "purchase.cancelled",
      "purchase.refunded",
      "purchase.chargeback",
      "subscription.cancelled",
      "access.expired",
    ]),
    occurred_at: z.string().datetime({ offset: true }),
    buyer_email: z.string().email().max(254),
  })
  .strict();
export type PaymentEvent = z.infer<typeof normalizedEvent>;

// Intentionally no provider implementations, credentials or public webhook route.
export interface PaymentProviderAdapter {
  verifySignature(rawBody: Uint8Array, headers: Headers): Promise<boolean>;
  normalize(rawBody: Uint8Array): Promise<PaymentEvent>;
}
export interface PaymentProcessorDependencies {
  adapters: ReadonlyMap<string, PaymentProviderAdapter>;
  // Must resolve/create an Auth account through a verified buyer identity.
  // Never accept a user_id or unverified email from a client request.
  resolveVerifiedBuyer(event: PaymentEvent): Promise<string>;
  apply(event: PaymentEvent, userId: string): Promise<boolean>;
}

export async function processVerifiedNotification(
  provider: string,
  rawBody: Uint8Array,
  headers: Headers,
  dependencies: PaymentProcessorDependencies,
) {
  const adapter = dependencies.adapters.get(provider);
  if (!adapter) throw new Error("Payment provider not configured.");
  if (!(await adapter.verifySignature(rawBody, headers)))
    throw new Error("Invalid payment notification signature.");
  const event = normalizedEvent.parse(await adapter.normalize(rawBody));
  if (event.payment_provider !== provider) throw new Error("Payment provider mismatch.");
  const userId = z
    .string()
    .uuid()
    .parse(await dependencies.resolveVerifiedBuyer(event));
  return dependencies.apply(event, userId);
}
