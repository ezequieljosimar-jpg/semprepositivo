import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Route as RootRoute } from "@/routes/__root";
import { completeDay, getProgress } from "@/lib/journey";
import { canRead, type Progress } from "@/lib/progression";

export function useJourney() {
  const { progress } = RootRoute.useRouteContext();
  const client = useQueryClient();
  const router = useRouter();
  const query = useQuery({
    queryKey: ["journey-progress"],
    queryFn: () => getProgress(),
    initialData: progress,
    staleTime: 0,
  });
  const value = query.data;
  return {
    ...value,
    done: Array.from({ length: value.completed }, (_, i) => i + 1),
    canRead: (n: number) => canRead(value, n),
    async complete(n: number) {
      await client.cancelQueries({ queryKey: ["journey-progress"] });
      const next: Progress = await completeDay({ data: n });
      client.setQueryData(["journey-progress"], next);
      await router.invalidate();
      return next;
    },
  };
}
