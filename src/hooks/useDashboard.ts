// /src/hooks/useDashboard.ts
import {
    getDashboardDaySummary,
    getDashboardRangeSummary,
    getDashboardRecentMedia,
    getDashboardStreaks,
    getDashboardWeekSummary,
    getDashboardWeeksTrend,
} from "@/src/services/dashboard.service";
import type { ApiAxiosError } from "@/src/services/http.client";
import type { WeekKey } from "@/src/types/workoutDashboard.types";
import { last7Range, todayIso, weekKeyFromIso } from "@/src/utils/dashboard/date";
import { useQuery } from "@tanstack/react-query";

export function useDashboard() {
    const today = todayIso();
    const weekKey = weekKeyFromIso(today) as WeekKey;
    const range = last7Range(today);

    const daySummary = useQuery({
        queryKey: ["dashboard", "daySummary", today],
        queryFn: () => getDashboardDaySummary(today),
    });

    const rangeSummary = useQuery({
        queryKey: ["dashboard", "rangeSummary", range.from, range.to],
        queryFn: () => getDashboardRangeSummary(range.from, range.to),
    });

    const weekSummary = useQuery({
        queryKey: ["dashboard", "weekSummary", weekKey],
        queryFn: () => getDashboardWeekSummary(weekKey),
    });

    const weekTrend = useQuery({
        queryKey: ["dashboard", "weekTrend", weekKey],
        queryFn: () => getDashboardWeeksTrend(weekKey),
    });

    const streaks = useQuery({
        queryKey: ["dashboard", "streaks", "training", 0, today],
        queryFn: () => getDashboardStreaks({ mode: "training", gapDays: 0, asOf: today }),
    });

    const media = useQuery({
        queryKey: ["dashboard", "media", range.from, range.to, 6],
        queryFn: () => getDashboardRecentMedia({ from: range.from, to: range.to, limit: 6 }),
    });

    const isLoading =
        daySummary.isLoading ||
        rangeSummary.isLoading ||
        weekSummary.isLoading ||
        weekTrend.isLoading ||
        streaks.isLoading ||
        media.isLoading;

    const error: ApiAxiosError | null =
        (daySummary.error as any) ||
        (rangeSummary.error as any) ||
        (weekSummary.error as any) ||
        (weekTrend.error as any) ||
        (streaks.error as any) ||
        (media.error as any) ||
        null;

    return {
        today,
        weekKey,
        range,
        isLoading,
        error,
        daySummary,
        rangeSummary,
        weekSummary,
        weekTrend,
        streaks,
        media,
    };
}