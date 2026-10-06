export const TOTAL_DAYS = 90;
export type Progress = { completed: number; currentDay: number | null };

export function progressFrom(completed: unknown): Progress {
  const count =
    typeof completed === "number" &&
    Number.isInteger(completed) &&
    completed >= 0 &&
    completed <= TOTAL_DAYS
      ? completed
      : 0;
  return { completed: count, currentDay: count === TOTAL_DAYS ? null : count + 1 };
}

export function canRead(progress: Progress, day: number) {
  return Number.isInteger(day) && day >= 1 && day <= TOTAL_DAYS && day <= progress.completed + 1;
}

export function completeSequentially(progress: Progress, day: number): Progress {
  if (!canRead(progress, day)) throw new Error("Conclua seu dia atual antes de continuar.");
  return progressFrom(Math.max(progress.completed, day));
}
