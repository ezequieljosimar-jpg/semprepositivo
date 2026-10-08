import { expect, it, vi } from "vitest";
const oauth = vi.hoisted(() => vi.fn());
vi.mock("@lovable.dev/cloud-auth-js", () => ({ createLovableAuth: () => ({ signInWithOAuth: oauth }) }));
import { signInManagedGoogle } from "@/lib/managed-google";
it("uses the official managed broker with the existing server-verifying callback", async () => {
  oauth.mockResolvedValue({ redirected: true, error: null });
  expect(await signInManagedGoogle()).toEqual({ redirected: true, error: null });
  expect(oauth).toHaveBeenCalledWith("google", { redirect_uri: `${window.location.origin}/auth/retorno` });
});
