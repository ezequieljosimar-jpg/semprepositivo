import { createServerFn } from "@tanstack/react-start";
import { canRead } from "./progression";

function dayNumber(input: unknown) {
  if (typeof input !== "number" || !Number.isInteger(input) || input < 1 || input > 90)
    throw new Error("Dia inválido.");
  return input;
}

export const getProgress = createServerFn({ method: "GET" }).handler(async () => {
  const { progressSession } = await import("./progress-session.server");
  return (await progressSession(true)).read();
});

export const completeDay = createServerFn({ method: "POST" })
  .validator(dayNumber)
  .handler(async ({ data }) => {
    const { progressSession } = await import("./progress-session.server");
    return (await progressSession()).complete(data);
  });

export const readDay = createServerFn({ method: "GET" })
  .validator(dayNumber)
  .handler(async ({ data }) => {
    const { progressSession } = await import("./progress-session.server");
    const progress = await (await progressSession()).read();
    if (!canRead(progress, data)) return { day: null, phase: null, progress };
    // Never import the devotional into the client bundle or return future content.
    const { getDay, getPhase } = await import("./devocional.server");
    const day = getDay(data)!;
    return { day, phase: getPhase(day.phase)!, progress };
  });

export const readClosing = createServerFn({ method: "GET" }).handler(async () => {
  const { progressSession } = await import("./progress-session.server");
  const progress = await (await progressSession()).read();
  if (progress.completed !== 90) return { content: null, progress };
  const { closingPage } = await import("./devocional.server");
  return { content: closingPage, progress };
});
