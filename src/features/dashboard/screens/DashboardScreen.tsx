// src/features/dashboard/screens/DashboardScreen.tsx

import React from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";

import { AppBrandFooter } from "@/src/features/components/branding/AppBrandFooter";
import { DashboardMediaViewerModal } from "@/src/features/dashboard/components/DashboardMediaViewerModal";
import DashboardRangeSection from "@/src/features/dashboard/sections/DashboardRangeSection";
import DashboardRecentMediaSection from "@/src/features/dashboard/sections/DashboardRecentMediaSection";
import DashboardStreakSection from "@/src/features/dashboard/sections/DashboardStreakSection";
import DashboardTodaySection from "@/src/features/dashboard/sections/DashboardTodaySection";
import DashboardWeekSection from "@/src/features/dashboard/sections/DashboardWeekSection";
import { ProgressExercisePreviewCard } from "@/src/features/progress/components/ProgressExercisePreviewCard";
import { useWorkoutProgress } from "@/src/hooks/summary/useWorkoutProgress";
import { useDashboard } from "@/src/hooks/useDashboard";
import { useAuthStore } from "@/src/store/auth.store";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { MediaFeedItem } from "@/src/types/media.types";
import { formatIsoToPPP, getSafeUserName, pickTrendPointForWeek } from "@/src/utils/dashboard/format";

function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }

    return "Intenta de nuevo.";
}

export default function DashboardScreen() {
    const { colors } = useTheme();

    const user = useAuthStore((state) => state.user);
    const name = getSafeUserName(user);

    const [selected, setSelected] = React.useState<MediaFeedItem | null>(null);

    const dashboard = useDashboard();
    const progress = useWorkoutProgress({
        mode: "last30",
        compareTo: "previous_period",
        includeExerciseProgress: true,
    });

    const todayLabel = React.useMemo(
        () => formatIsoToPPP(dashboard.today),
        [dashboard.today]
    );

    const rangeTraining = dashboard.rangeSummary.data?.training ?? null;
    const rangeSleep = dashboard.rangeSummary.data?.sleep ?? null;

    const day = dashboard.daySummary.data ?? null;
    const week = dashboard.weekSummary.data ?? null;
    const streaks = dashboard.streaks.data ?? null;
    const media: MediaFeedItem[] = dashboard.media.data?.items ?? [];

    const trendPoint = React.useMemo(
        () => pickTrendPointForWeek(dashboard.weekTrend.data, dashboard.weekKey),
        [dashboard.weekTrend.data, dashboard.weekKey]
    );

    const handleRefresh = React.useCallback(() => {
        void Promise.all([dashboard.refreshAll(), progress.refetch()]);
    }, [dashboard, progress]);

    return (
        <>
            <ScrollView
                style={{ flex: 1, backgroundColor: colors.background }}
                contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 26 }}
                refreshControl={
                    <RefreshControl
                        refreshing={(dashboard.isRefreshing && !dashboard.isLoading) || progress.isRefetching}
                        onRefresh={handleRefresh}
                        tintColor={colors.primary}
                    />
                }
            >
                <View style={{ gap: 4 }}>
                    <Text
                        style={{
                            fontSize: 22,
                            fontWeight: "800",
                            color: colors.text,
                        }}
                    >
                        Bienvenido, {name}
                    </Text>

                    <Text
                        style={{
                            color: colors.mutedText,
                            fontSize: 13,
                            marginBottom: 5,
                        }}
                    >
                        Hoy:{" "}
                        <Text style={{ fontFamily: "Menlo", color: colors.text }}>
                            {dashboard.today}
                        </Text>{" "}
                        · {todayLabel} · Semana:{" "}
                        <Text style={{ fontFamily: "Menlo", color: colors.text }}>
                            {dashboard.weekKey}
                        </Text>
                    </Text>
                </View>

                {dashboard.error ? (
                    <View
                        style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 14,
                            padding: 12,
                            gap: 8,
                            backgroundColor: colors.surface,
                        }}
                    >
                        <View style={{ gap: 2 }}>
                            <Text
                                style={{
                                    fontSize: 16,
                                    fontWeight: "800",
                                    color: colors.text,
                                }}
                            >
                                Error
                            </Text>

                            <Text style={{ color: colors.mutedText }}>
                                No se pudo cargar el dashboard
                            </Text>
                        </View>

                        <Text style={{ color: colors.mutedText }}>
                            {getErrorMessage(dashboard.error)}
                        </Text>
                    </View>
                ) : null}

                <DashboardTodaySection
                    data={day}
                    isLoading={dashboard.isLoading}
                />

                <DashboardWeekSection
                    data={week}
                    trendPoint={trendPoint}
                    isLoading={dashboard.isLoading}
                />

                <ProgressExercisePreviewCard
                    data={progress.data ?? null}
                    isLoading={progress.isLoading}
                />

                <DashboardRangeSection
                    from={dashboard.range.from}
                    to={dashboard.range.to}
                    training={rangeTraining}
                    sleep={rangeSleep}
                />

                <DashboardStreakSection
                    data={streaks}
                    isLoading={dashboard.isLoading}
                />

                <DashboardRecentMediaSection
                    items={media}
                    isLoading={dashboard.isLoading}
                    onSelect={setSelected}
                />

                <AppBrandFooter />
            </ScrollView>

            <DashboardMediaViewerModal
                visible={!!selected}
                item={selected}
                onClose={() => setSelected(null)}
            />
        </>
    );
}