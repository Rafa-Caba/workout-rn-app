// /src/services/workout/media.service.ts
import { api } from "@/src/services/http.client";
import type { MediaFeedResponse, MediaResourceType, MediaStatsResponse } from "@/src/types/media.types";

export type GetMediaParams = {
    source?: "day" | "routine" | "all";

    from?: string;
    to?: string;
    date?: string;
    weekKey?: string;
    sessionId?: string;
    resourceType?: MediaResourceType;

    limit?: number;
    cursor?: string;
};

export async function getMedia(params?: GetMediaParams): Promise<MediaFeedResponse> {
    const res = await api.get(`/workout/media`, {
        params: {
            source: params?.source ?? "all",
            from: params?.from,
            to: params?.to,
            date: params?.date,
            weekKey: params?.weekKey,
            sessionId: params?.sessionId,
            resourceType: params?.resourceType,
            limit: params?.limit,
            cursor: params?.cursor,
        },
    });

    return res.data as MediaFeedResponse;
}

export async function getMediaStats(
    from: string,
    to: string,
    source: "day" | "routine" | "all" = "all"
): Promise<MediaStatsResponse> {
    const res = await api.get(`/workout/media/stats`, { params: { from, to, source } });
    return res.data as MediaStatsResponse;
}