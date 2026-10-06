export const TOTAL_DAYS = 90;
export const DAY_WAIT_MS = 12 * 60 * 60 * 1000;
export type Progress = {
  completed: number;
  currentDay: number | null;
  ownerId?: string | null;
  nextAvailableAt?: string | null;
};

export function progressFrom(completed: unknown, nextAvailableAt?: string | null): Progress {
  const count =
    typeof completed === "number" &&
    Number.isInteger(completed) &&
    completed >= 0 &&
    completed <= TOTAL_DAYS
      ? completed
      : 0;
  return {
    completed: count,
    currentDay: count === TOTAL_DAYS ? null : count + 1,
    ...(nextAvailableAt !== undefined
      ? { nextAvailableAt: count === TOTAL_DAYS ? null : nextAvailableAt }
      : {}),
  };
}

export function waitingForNextDay(progress: Progress, now = Date.now()) {
  if (!progress.currentDay || !progress.nextAvailableAt) return false;
  const available = Date.parse(progress.nextAvailableAt);
  return !Number.isFinite(available) || now < available;
}

export function canRead(progress: Progress, day: number, now = Date.now()) {
  return (
    Number.isInteger(day) &&
    day >= 1 &&
    day <= TOTAL_DAYS &&
    (day <= progress.completed ||
      (day === progress.currentDay && !waitingForNextDay(progress, now)))
  );
}

export function completeSequentially(progress: Progress, day: number, now = Date.now()): Progress {
  if (!canRead(progress, day, now)) throw new Error("Aguarde a liberação do próximo dia.");
  if (day <= progress.completed) return progress;
  return progressFrom(day, day === TOTAL_DAYS ? null : new Date(now + DAY_WAIT_MS).toISOString());
}
