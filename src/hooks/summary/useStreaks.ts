import { useQuery } from "@tanstack/react-query";

import type { ApiAxiosError } from "@/src/services/http.client";
import type { StreaksMode, StreaksResponse } from "@/src/services/workout/insights.service";
import { getStreaks } from "@/src/services/workout/insights.service";

export function useStreaks(args: { mode: StreaksMode; gapDays?: number; asOf?: string }, enabled: boolean) {
    return useQuery<StreaksResponse, ApiAxiosError>({
        queryKey: ["streaks", args.mode, args.gapDays ?? null, args.asOf ?? null],
        queryFn: () => getStreaks(args),
        enabled,
        staleTime: 30_000,
    });
}