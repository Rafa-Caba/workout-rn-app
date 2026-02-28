// /src/services/dashboard.service.ts
import { api } from "@/src/services/http.client";
import type {
    DaySummaryResponse,
    ISODate,
    MediaFeedResponse,
    RangeSummaryResponse,
    StreaksResponse,
    WeekKey,
    WeekSummaryResponse,
    WeeksTrendResponse,
} from "@/src/types/workoutDashboard.types";

export async function getDashboardDaySummary(date: ISODate) {
    const { data } = await api.get<DaySummaryResponse>(`/workout/days/${encodeURIComponent(date)}/summary`);
    return data;
}

export async function getDashboardWeekSummary(weekKey: WeekKey) {
    const { data } = await api.get<WeekSummaryResponse>(`/workout/weeks/${encodeURIComponent(weekKey)}/summary`);
    return data;
}

export async function getDashboardRangeSummary(from: ISODate, to: ISODate) {
    const { data } = await api.get<RangeSummaryResponse>(`/workout/summary`, { params: { from, to } });
    return data;
}

export async function getDashboardWeeksTrend(fromWeek: WeekKey, toWeek?: WeekKey) {
    const { data } = await api.get<WeeksTrendResponse>(`/workout/trends/weeks`, {
        params: { fromWeek, ...(toWeek ? { toWeek } : {}) },
    });
    return data;
}

export async function getDashboardStreaks(args: {
    mode: "training" | "sleep" | "both";
    gapDays: number;
    asOf?: ISODate;
}) {
    const { data } = await api.get<StreaksResponse>(`/workout/insights/streaks`, {
        params: { mode: args.mode, gapDays: args.gapDays, ...(args.asOf ? { asOf: args.asOf } : {}) },
    });
    return data;
}

export async function getDashboardRecentMedia(args: { from: ISODate; to: ISODate; limit?: number }) {
    const { data } = await api.get<MediaFeedResponse>(`/workout/media`, {
        params: { from: args.from, to: args.to, limit: args.limit ?? 6 },
    });
    return data;
}