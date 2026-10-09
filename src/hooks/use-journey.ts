import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Route as RootRoute } from "@/routes/__root";
import { completeDay, getProgress } from "@/lib/journey";
import { useEffect } from "react";
import { waitingForNextDay, canRead, type Progress } from "@/lib/progression";

export function useJourney(watchRelease = false) {
  const { progress } = RootRoute.useRouteContext();
  const client = useQueryClient();
  const router = useRouter();
  const queryKey = ["journey-progress", progress.ownerId ?? "anonymous"];
  const query = useQuery({
    queryKey,
    queryFn: () => getProgress(),
    initialData: progress,
    refetchInterval: watchRelease ? 60_000 : false,
    // The root loader already verified this progress on the server. Avoid an
    // immediate duplicate request on hydration; mutations and the release timer
    // still invalidate it, and every protected operation checks the backend.
    staleTime: 30_000,
  });
  const value = query.data;
  useEffect(() => {
    if (!watchRelease || !value.nextAvailableAt || !waitingForNextDay(value)) return;
    const timer = setTimeout(
      async () => {
        await client.invalidateQueries({
          queryKey: ["journey-progress", value.ownerId ?? "anonymous"],
        });
        await router.invalidate();
      },
      Math.max(1, Date.parse(value.nextAvailableAt) - Date.now() + 250),
    );
    return () => clearTimeout(timer);
  }, [watchRelease, value.nextAvailableAt, value.ownerId, client, router]);
  return {
    ...value,
    done: Array.from({ length: value.completed }, (_, i) => i + 1),
    canRead: (n: number) => canRead(value, n),
    async complete(n: number) {
      await client.cancelQueries({ queryKey });
      const next: Progress = await completeDay({ data: n });
      client.setQueryData(queryKey, next);
      await router.invalidate();
      return next;
    },
  };
}

export function JourneyReleaseWatcher() {
  useJourney(true);
  return null;
}
