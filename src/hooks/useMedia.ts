// /src/hooks/useMedia.ts
// Media feed query with canonical cache keys.

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/src/query/queryKeys";
import type { ApiAxiosError } from "@/src/services/http.client";
import { getMedia, type GetMediaParams } from "@/src/services/workout/media.service";
import type { MediaFeedResponse } from "@/src/types/media.types";

export function useMedia(params?: GetMediaParams) {
    const keyParams = {
        date: params?.date ?? null,
        from: params?.from ?? null,
        to: params?.to ?? null,
        weekKey: params?.weekKey ?? null,
        sessionId: params?.sessionId ?? null,
        resourceType: params?.resourceType ?? null,
        source: params?.source ?? null,
        limit: params?.limit ?? null,
        cursor: params?.cursor ?? null,
    };

    return useQuery<MediaFeedResponse, ApiAxiosError>({
        queryKey: queryKeys.media.feed(keyParams),
        queryFn: () => getMedia(params),
        staleTime: 30_000,
    });
}
