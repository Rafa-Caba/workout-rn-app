// /src/features/daySummary/screens/DayTrainingSessionSleepDetailsScreen.tsx

/**
 * DayTrainingSessionSleepDetailsScreen
 *
 * Detailed "Día" tab:
 * - date summary header
 * - sleep section
 * - sessions section
 *
 * This screen auto-bootstraps missing health data:
 * - if sleep is missing -> tries sleep bootstrap
 * - if sessions are missing -> tries minimal workout bootstrap
 * - it never overwrites existing data
 */

import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import type { MediaViewerItem } from "@/src/features/components/media/MediaViewerModal";
import { MediaViewerModal } from "@/src/features/components/media/MediaViewerModal";

import { useDayAutoBootstrap } from "@/src/hooks/health/useDayAutoBootstrap";
import { useWorkoutDay } from "@/src/hooks/workout/useWorkoutDay";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { WorkoutDay } from "@/src/types/workoutDay.types";

import { DayPill } from "../components/DayMetricGrid";
import { DaySessionsSection } from "../components/DaySessionsSection";
import { DaySleepSection } from "../components/DaySleepSection";
import {
    countMedia,
    normalizeSessions,
    type DayUiColors,
} from "../components/dayDetail.helpers";

type Props = {
    date: string;
};

function hasMeaningfulSleep(day: WorkoutDay | null): boolean {
    return day?.sleep !== null && day?.sleep !== undefined;
}

function hasMeaningfulSessions(day: WorkoutDay | null): boolean {
    return Array.isArray(day?.training?.sessions) && day.training.sessions.length > 0;
}

export function DayTrainingSessionSleepDetailsScreen({ date }: Props) {
    const { colors } = useTheme();

    const uiColors: DayUiColors = {
        background: colors.background,
        surface: colors.surface,
        border: colors.border,
        text: colors.text,
        mutedText: colors.mutedText,
    };

    const workoutDayQuery = useWorkoutDay(date);
    const day: WorkoutDay | null = workoutDayQuery.data ?? null;

    const autoBootstrap = useDayAutoBootstrap();
    const [autoBootstrapAttempted, setAutoBootstrapAttempted] = React.useState(false);

    const [viewerVisible, setViewerVisible] = React.useState(false);
    const [viewerItem, setViewerItem] = React.useState<MediaViewerItem | null>(null);

    const openViewer = React.useCallback((item: MediaViewerItem) => {
        setViewerItem(item);
        setViewerVisible(true);
    }, []);

    const closeViewer = React.useCallback(() => {
        setViewerVisible(false);
        setViewerItem(null);
    }, []);

    const missingSleep = !hasMeaningfulSleep(day);
    const missingSessions = !hasMeaningfulSessions(day);

    React.useEffect(() => {
        setAutoBootstrapAttempted(false);
    }, [date]);

    React.useEffect(() => {
        if (!date) return;
        if (workoutDayQuery.isLoading || workoutDayQuery.isFetching) return;
        if (autoBootstrap.isPending) return;
        if (autoBootstrapAttempted) return;
        if (!missingSleep && !missingSessions) return;

        setAutoBootstrapAttempted(true);

        void autoBootstrap
            .autoBootstrapDay({ date })
            .then(async () => {
                await workoutDayQuery.refetch();
            })
            .catch(() => {
                // Silent fail: screen still works with manual/empty state.
            });
    }, [
        date,
        workoutDayQuery.isLoading,
        workoutDayQuery.isFetching,
        workoutDayQuery.refetch,
        autoBootstrap,
        autoBootstrapAttempted,
        missingSleep,
        missingSessions,
    ]);

    if (workoutDayQuery.isLoading) {
        return (
            <View style={[styles.center, { backgroundColor: uiColors.background }]}>
                <ActivityIndicator />
                <Text style={[styles.centerText, { color: uiColors.mutedText }]}>Cargando día...</Text>
            </View>
        );
    }

    if (workoutDayQuery.isError) {
        return (
            <View style={[styles.center, { backgroundColor: uiColors.background }]}>
                <Text style={[styles.centerText, { color: uiColors.mutedText }]}>No se pudo cargar el día.</Text>
            </View>
        );
    }

    if (!day) {
        return (
            <View style={[styles.center, { backgroundColor: uiColors.background }]}>
                <Text style={[styles.centerText, { color: uiColors.mutedText }]}>No hay datos para este día.</Text>
            </View>
        );
    }

    const sessions = normalizeSessions(day);
    const sessionsCount = sessions.length;
    const mediaCount = countMedia(sessions);

    return (
        <View style={styles.container}>
            <MediaViewerModal visible={viewerVisible} item={viewerItem} onClose={closeViewer} />

            <View style={[styles.topRow, { borderColor: uiColors.border, backgroundColor: uiColors.surface }]}>
                <View style={styles.topRowLeft}>
                    <Text style={[styles.topRowTitle, { color: uiColors.text }]}>📅 Fecha</Text>
                    <Text style={[styles.topRowValue, { color: uiColors.mutedText }]}>{day.date || "—"}</Text>
                </View>

                <View style={styles.pills}>
                    <DayPill label={`🏋️ Sesiones: ${sessionsCount}`} colors={uiColors} />
                    <DayPill label={`🖼️ Media: ${mediaCount}`} colors={uiColors} />
                </View>
            </View>

            {(autoBootstrap.isPending || autoBootstrap.data?.bootstrappedSleep || autoBootstrap.data?.bootstrappedWorkout) ? (
                <View
                    style={[
                        styles.bootstrapBanner,
                        {
                            borderColor: uiColors.border,
                            backgroundColor: uiColors.surface,
                        },
                    ]}
                >
                    <View style={{ flex: 1, gap: 4 }}>
                        <Text style={[styles.bootstrapTitle, { color: uiColors.text }]}>
                            Auto-bootstrap del día
                        </Text>

                        {autoBootstrap.isPending ? (
                            <Text style={[styles.bootstrapText, { color: uiColors.mutedText }]}>
                                Intentando importar sueño y/o métricas del dispositivo…
                            </Text>
                        ) : (
                            <Text style={[styles.bootstrapText, { color: uiColors.mutedText }]}>
                                {autoBootstrap.data?.bootstrappedSleep || autoBootstrap.data?.bootstrappedWorkout
                                    ? "Se importó información disponible desde Salud para este día."
                                    : "No hubo datos nuevos para importar."}
                            </Text>
                        )}
                    </View>

                    {!autoBootstrap.isPending ? (
                        <Pressable
                            onPress={() => {
                                void autoBootstrap
                                    .autoBootstrapDay({ date })
                                    .then(async () => {
                                        await workoutDayQuery.refetch();
                                    })
                                    .catch(() => {
                                        // silent
                                    });
                            }}
                            style={{
                                paddingHorizontal: 12,
                                paddingVertical: 10,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: uiColors.border,
                                backgroundColor: uiColors.background,
                            }}
                        >
                            <Text style={{ color: uiColors.text, fontWeight: "800" }}>Reintentar</Text>
                        </Pressable>
                    ) : (
                        <ActivityIndicator />
                    )}
                </View>
            ) : null}

            <DaySleepSection sleep={day.sleep} colors={uiColors} />

            <DaySessionsSection
                day={day}
                sessions={sessions}
                colors={uiColors}
                onOpenMedia={openViewer}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, gap: 12, },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, },
    centerText: { fontSize: 13, fontWeight: "600", },
    topRow: {
        borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: "row",
        alignItems: "center", justifyContent: "space-between", gap: 10,
    },
    topRowLeft: { flex: 1, },
    topRowTitle: { fontSize: 12, fontWeight: "900", },
    topRowValue: { marginTop: 4, fontSize: 13, fontWeight: "700", },
    pills: { flexDirection: "row", gap: 8, flexWrap: "wrap", },
    bootstrapBanner: {
        borderWidth: 1, borderRadius: 16, padding: 14,
        flexDirection: "row", alignItems: "center", gap: 12,
    },
    bootstrapTitle: { fontSize: 13, fontWeight: "900", },
    bootstrapText: { fontSize: 12, fontWeight: "600", lineHeight: 18, },
});