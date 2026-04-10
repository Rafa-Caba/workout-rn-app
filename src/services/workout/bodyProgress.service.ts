// src/services/workout/bodyProgress.service.ts

import { api } from "@/src/services/http.client";
import type {
    BodyProgressOverviewQuery,
    BodyProgressOverviewResponse,
} from "@/src/types/bodyProgress.types";

type BodyProgressRequestParams = {
    mode: BodyProgressOverviewQuery["mode"];
    from?: string;
    to?: string;
    compareTo?: BodyProgressOverviewQuery["compareTo"];
};

export async function getBodyProgressOverview(
    args: BodyProgressRequestParams
): Promise<BodyProgressOverviewResponse> {
    const params: Record<string, string | undefined> = {
        mode: args.mode,
        from: args.from,
        to: args.to,
        compareTo: args.compareTo ?? "previous_period",
    };

    const res = await api.get("/workout/progress/body", { params });

    return res.data as BodyProgressOverviewResponse;
}