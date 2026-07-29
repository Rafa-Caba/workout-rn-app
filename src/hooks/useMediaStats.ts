// /src/hooks/useMediaStats.ts
// Media statistics query with canonical cache keys.

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/src/query/queryKeys";
import type { ApiAxiosError } from "@/src/services/http.client";
import { getMediaStats } from "@/src/services/workout/media.service";
import type { MediaStatsResponse } from "@/src/types/media.types";

export function useMediaStats(
    from: string,
    to: string,
    enabled: boolean,
    source: "day" | "routine" | "all" = "all",
) {
    return useQuery<MediaStatsResponse, ApiAxiosError>({
        queryKey: queryKeys.media.stats({ from, to, source }),
        queryFn: () => getMediaStats(from, to, source),
        enabled,
        staleTime: 60_000,
    });
}
