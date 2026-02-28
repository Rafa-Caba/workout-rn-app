// /src/hooks/useMediaStats.ts
import type { ApiAxiosError } from "@/src/services/http.client";
import { getMediaStats } from "@/src/services/workout/media.service";
import type { MediaStatsResponse } from "@/src/types/media.types";
import { useQuery } from "@tanstack/react-query";

export function useMediaStats(
    from: string,
    to: string,
    enabled: boolean,
    source: "day" | "routine" | "all" = "all"
) {
    return useQuery<MediaStatsResponse, ApiAxiosError>({
        queryKey: ["mediaStats", { from, to, source }],
        queryFn: () => getMediaStats(from, to, source),
        enabled,
        staleTime: 60_000,
    });
}