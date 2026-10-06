import { createClient } from "@supabase/supabase-js";
import type { PaymentEvent } from "./payment-provider.server";

// Internal service-role operation; not a createServerFn and not an HTTP route.
// Only call from processVerifiedNotification after configuring a real adapter.
export async function applyVerifiedPaymentEvent(event: PaymentEvent, resolvedUserId: string) {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key || new URL(url).protocol !== "https:")
    throw new Error("Payment persistence is not configured.");
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.rpc("apply_devotional_payment_event", {
    p_provider: event.payment_provider,
    p_event_id: event.event_id,
    p_order_id: event.order_id,
    p_user_id: resolvedUserId,
    p_event_type: event.event_type,
    p_occurred_at: event.occurred_at,
  });
  if (error) throw new Error("Could not persist the verified payment notification.");
  return data === true;
}
