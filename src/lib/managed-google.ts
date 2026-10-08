import { createLovableAuth } from "@lovable.dev/cloud-auth-js";

// Managed Cloud OAuth uses the official broker, not Supabase's BYOK authorize URL.
// Return credentials are verified by the existing server acceptSession function.
export function signInManagedGoogle() {
  return createLovableAuth().signInWithOAuth("google", {
    redirect_uri: new URL("/auth/retorno", window.location.origin).href,
  });
}
