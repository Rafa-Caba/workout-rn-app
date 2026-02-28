// /src/services/workout/weeks.service.ts
import { api } from "@/src/services/http.client";
import type { RangeSummaryResponse, WeekSummaryResponse } from "@/src/types/workoutSummary.types";

export async function getWeekSummary(weekKey: string): Promise<WeekSummaryResponse> {
    const res = await api.get(`/workout/weeks/${encodeURIComponent(weekKey)}/summary`);
    return res.data as WeekSummaryResponse;
}

export async function getRangeSummary(from: string, to: string): Promise<RangeSummaryResponse> {
    const res = await api.get(`/workout/summary`, { params: { from, to } });
    return res.data as RangeSummaryResponse;
}