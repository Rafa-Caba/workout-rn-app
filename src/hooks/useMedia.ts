// /src/hooks/useMedia.ts
import type { ApiAxiosError } from "@/src/services/http.client";
import { getMedia, type GetMediaParams } from "@/src/services/workout/media.service";
import type { MediaFeedResponse } from "@/src/types/media.types";
import { useQuery } from "@tanstack/react-query";

export function useMedia(params?: GetMediaParams) {
    return useQuery<MediaFeedResponse, ApiAxiosError>({
        queryKey: ["media", params ?? {}],
        queryFn: () => getMedia(params),
        staleTime: 30_000,
    });
}