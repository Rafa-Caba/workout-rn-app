// src/services/workout/weeks.service.ts
// Typed summary endpoints shared by Weeks, Trends, and Periods.

import { api } from "@/src/services/http.client";
import type {
    RangeSummaryResponse,
    WeekSummaryResponse,
} from "@/src/types/workoutSummary.types";

export async function getWeekSummary(weekKey: string): Promise<WeekSummaryResponse> {
    const response = await api.get<WeekSummaryResponse>(
        `/workout/weeks/${encodeURIComponent(weekKey)}/summary`,
    );
    return response.data;
}

export async function getRangeSummary(from: string, to: string): Promise<RangeSummaryResponse> {
    const response = await api.get<RangeSummaryResponse>("/workout/summary", {
        params: { from, to },
    });
    return response.data;
}
