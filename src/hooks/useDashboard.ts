// /src/hooks/useDashboard.ts
// Aggregates the dashboard queries under canonical cache keys.

import { useQuery } from "@tanstack/react-query";
import * as React from "react";

import { queryKeys } from "@/src/query/queryKeys";
import {
    getDashboardDaySummary,
    getDashboardRangeSummary,
    getDashboardRecentMedia,
    getDashboardStreaks,
    getDashboardWeekSummary,
    getDashboardWeeksTrend,
} from "@/src/services/dashboard.service";
import type { ApiAxiosError } from "@/src/services/http.client";
import { last7Range, todayIso, weekKeyFromIso } from "@/src/utils/dashboard/date";

type DashboardQueryError = ApiAxiosError | null;

function pickFirstDashboardError(
    errors: Array<ApiAxiosError | null>,
): DashboardQueryError {
    return errors.find((error): error is ApiAxiosError => error !== null) ?? null;
}

export function useDashboard() {
    const today = todayIso();
    const weekKey = weekKeyFromIso(today);
    const range = last7Range(today);

    const daySummary = useQuery<
        Awaited<ReturnType<typeof getDashboardDaySummary>>,
        ApiAxiosError
    >({
        queryKey: queryKeys.dashboard.daySummary(today),
        queryFn: () => getDashboardDaySummary(today),
    });

    const rangeSummary = useQuery<
        Awaited<ReturnType<typeof getDashboardRangeSummary>>,
        ApiAxiosError
    >({
        queryKey: queryKeys.dashboard.rangeSummary(range.from, range.to),
        queryFn: () => getDashboardRangeSummary(range.from, range.to),
    });

    const weekSummary = useQuery<
        Awaited<ReturnType<typeof getDashboardWeekSummary>>,
        ApiAxiosError
    >({
        queryKey: queryKeys.dashboard.weekSummary(weekKey),
        queryFn: () => getDashboardWeekSummary(weekKey),
    });

    const weekTrend = useQuery<
        Awaited<ReturnType<typeof getDashboardWeeksTrend>>,
        ApiAxiosError
    >({
        queryKey: queryKeys.dashboard.weekTrend(weekKey),
        queryFn: () => getDashboardWeeksTrend(weekKey),
    });

    const streaks = useQuery<
        Awaited<ReturnType<typeof getDashboardStreaks>>,
        ApiAxiosError
    >({
        queryKey: queryKeys.dashboard.streaks("training", 0, today),
        queryFn: () =>
            getDashboardStreaks({ mode: "training", gapDays: 0, asOf: today }),
    });

    const media = useQuery<
        Awaited<ReturnType<typeof getDashboardRecentMedia>>,
        ApiAxiosError
    >({
        queryKey: queryKeys.dashboard.media(range.from, range.to, 6),
        queryFn: () =>
            getDashboardRecentMedia({ from: range.from, to: range.to, limit: 6 }),
    });

    const isLoading =
        daySummary.isLoading ||
        rangeSummary.isLoading ||
        weekSummary.isLoading ||
        weekTrend.isLoading ||
        streaks.isLoading ||
        media.isLoading;

    const isRefreshing =
        daySummary.isRefetching ||
        rangeSummary.isRefetching ||
        weekSummary.isRefetching ||
        weekTrend.isRefetching ||
        streaks.isRefetching ||
        media.isRefetching;

    const error = pickFirstDashboardError([
        daySummary.error,
        rangeSummary.error,
        weekSummary.error,
        weekTrend.error,
        streaks.error,
        media.error,
    ]);

    const refreshAll = React.useCallback(async (): Promise<void> => {
        await Promise.all([
            daySummary.refetch(),
            rangeSummary.refetch(),
            weekSummary.refetch(),
            weekTrend.refetch(),
            streaks.refetch(),
            media.refetch(),
        ]);
    }, [daySummary, rangeSummary, weekSummary, weekTrend, streaks, media]);

    return {
        today,
        weekKey,
        range,
        isLoading,
        isRefreshing,
        error,
        refreshAll,
        daySummary,
        rangeSummary,
        weekSummary,
        weekTrend,
        streaks,
        media,
    };
}
