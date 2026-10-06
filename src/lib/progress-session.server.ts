import { serverEnv } from "./server-env.server";
import { useSession as createCookieSession, setResponseHeader } from "@tanstack/react-start/server";
import { progressFrom, completeSequentially } from "./progression";
import { accountsEnabled } from "./supabase.server";

// This adapter is the persistence boundary. A future account-backed repository
// can replace it without changing the progression rules or page components.
export async function progressSession(publicView = false) {
  if (accountsEnabled()) {
    const { accountProgress } = await import("./account-session.server");
    return accountProgress(publicView);
  }
  const password = serverEnv("PROGRESS_SESSION_SECRET");
  if (!password || password.length < 32) {
    throw new Error(
      "Configure PROGRESS_SESSION_SECRET with at least 32 characters in the server environment.",
    );
  }
  setResponseHeader("Cache-Control", "private, no-store");
  const session = await createCookieSession<{
    completed?: number;
    version?: number;
    nextAvailableAt?: string | null;
  }>({
    name: "sempre-positivo-progress",
    password,
    maxAge: 60 * 60 * 24 * 365 * 10,
    sessionHeader: false,
    cookie: {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      path: "/",
    },
  });
  return {
    read: async () => progressFrom(session.data.completed, session.data.nextAvailableAt),
    async complete(day: number) {
      const previous = progressFrom(session.data.completed, session.data.nextAvailableAt);
      const next = completeSequentially(previous, day);
      if (next.completed !== previous.completed) {
        await session.update({
          completed: next.completed,
          nextAvailableAt: next.nextAvailableAt ?? null,
          version: 2,
        });
      }
      return next;
    },
  };
}
