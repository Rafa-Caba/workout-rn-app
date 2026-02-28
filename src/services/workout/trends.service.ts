// /src/services/workout/trends.service.ts
import { api } from "@/src/services/http.client";
import type { WeekKey, WeeksTrendResponse } from "@/src/types/workoutSummary.types";

export async function getWeeklyTrends(fromWeek: WeekKey, toWeek: WeekKey): Promise<WeeksTrendResponse> {
    const res = await api.get(`/workout/trends/weeks`, { params: { fromWeek, toWeek } });
    return res.data as WeeksTrendResponse;
}