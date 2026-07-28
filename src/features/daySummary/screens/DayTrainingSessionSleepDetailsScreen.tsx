// /src/features/daySummary/screens/DayTrainingSessionSleepDetailsScreen.tsx

/**
 * Unified WorkoutDay detail body.
 *
 * This screen replaces the former Resumen / Día split and renders, in order:
 * - top KPIs
 * - Health auto-bootstrap status
 * - typed notes attached to the day
 * - sleep panel
 * - separated Gym and Cardio panels
 */

import React from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";

import type { MediaViewerItem } from "@/src/features/components/media/MediaViewerModal";
import { MediaViewerModal } from "@/src/features/components/media/MediaViewerModal";
import { DayNotesSection } from "@/src/features/daySummary/components/DayNotesSection";
import { useDayAutoBootstrap } from "@/src/hooks/health/useDayAutoBootstrap";
import { useHealthPermissions } from "@/src/hooks/health/useHealthPermissions";
import { useWorkoutDay } from "@/src/hooks/workout/useWorkoutDay";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { HealthPermissionsStatus } from "@/src/types/health/cardio/health.types";
import type { WorkoutDay } from "@/src/types/workoutDay.types";
import { minutesToHhMm } from "@/src/utils/dashboard/format";

import { DaySessionsSection } from "../components/DaySessionsSection";
import { DaySleepSection } from "../components/DaySleepSection";
import {
    countMedia,
    formatDurationSeconds,
    normalizeSessions,
    splitSessionsByKind,
    sumNullable,
    type DayUiColors,
} from "../components/dayDetail.helpers";

type Props = {
    date: string;
};

type KpiCardProps = {
    label: string;
    value: string;
    colors: DayUiColors;
};

function hasMeaningfulSleep(day: WorkoutDay | null): boolean {
    if (!day?.sleep) {
        return false;
    }

    return [
        day.sleep.timeAsleepMinutes,
        day.sleep.timeInBedMinutes,
        day.sleep.score,
        day.sleep.awakeMinutes,
        day.sleep.remMinutes,
        day.sleep.coreMinutes,
        day.sleep.deepMinutes,
    ].some((value) => typeof value === "number" && Number.isFinite(value));
}

function hasMeaningfulSessions(day: WorkoutDay | null): boolean {
    return Array.isArray(day?.training?.sessions) && day.training.sessions.length > 0;
}

function hasRelevantHealthReadPermissions(status: HealthPermissionsStatus | null): boolean {
    if (!status || !status.available) {
        return false;
    }

    const entries = Object.entries(status.permissions);
    if (entries.length === 0) {
        return false;
    }

    const relevantEntries = entries.filter(([key]) =>
        /(sleep|exercise|workout|distance|steps|heart|calorie|active|total|elevation|speed|pace|cadence)/i.test(
            key
        )
    );

    const targetEntries = relevantEntries.length > 0 ? relevantEntries : entries;
    return targetEntries.every(([, value]) => value === "granted");
}

function safeText(value: unknown): string {
    const text = String(value ?? "").trim();
    return text.length > 0 ? text : "Error desconocido";
}

function isMissingHealthPermissionError(error: unknown): boolean {
    const message = String(error ?? "");

    return (
        message.includes("READ_SLEEP") ||
        message.includes("HealthConnectException") ||
        message.includes("SecurityException") ||
        message.includes("SleepSessionRecord") ||
        message.toLowerCase().includes("permission")
    );
}

function KpiCard({ label, value, colors }: KpiCardProps) {
    return (
        <View style={[styles.kpiCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.kpiLabel, { color: colors.mutedText }]} numberOfLines={2}>
                {label}
            </Text>
            <Text style={[styles.kpiValue, { color: colors.text }]} numberOfLines={2}>
                {value}
            </Text>
        </View>
    );
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
    const [permissionWarning, setPermissionWarning] = React.useState<string | null>(null);
    const [viewerVisible, setViewerVisible] = React.useState(false);
    const [viewerItem, setViewerItem] = React.useState<MediaViewerItem | null>(null);

    const {
        availability,
        provider,
        permissionsStatus,
        isCheckingAvailability,
        isRequestingPermissions,
        requestPermissions,
    } = useHealthPermissions();

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
    const providerLabel =
        provider === "healthkit"
            ? "HealthKit"
            : provider === "health-connect"
                ? "Health Connect"
                : "Salud";

    const canAttemptBootstrap = availability && hasRelevantHealthReadPermissions(permissionsStatus);
    const bootstrapBusy =
        autoBootstrap.isPending || isCheckingAvailability || isRequestingPermissions;

    const runPermissionAwareBootstrap = React.useCallback(
        async (source: "auto" | "manual") => {
            if (!date) {
                return;
            }

            if (!availability) {
                if (source === "manual") {
                    Alert.alert(
                        "Salud no disponible",
                        "La integración de Salud no está disponible en este dispositivo o build."
                    );
                }

                setPermissionWarning("Salud no está disponible en este dispositivo o build.");
                return;
            }

            try {
                const status = await requestPermissions();

                if (!hasRelevantHealthReadPermissions(status)) {
                    const message =
                        "Todavía faltan permisos de Salud para importar sueño o sesiones del dispositivo.";
                    setPermissionWarning(message);

                    if (source === "manual") {
                        Alert.alert("Permisos requeridos", message);
                    }

                    return;
                }

                setPermissionWarning(null);

                const result = await autoBootstrap.autoBootstrapDay({ date });
                await workoutDayQuery.refetch();

                if (source === "manual" && !result.bootstrappedSleep && !result.bootstrappedWorkout) {
                    Alert.alert(
                        "Sin datos nuevos",
                        "No se encontraron datos nuevos para importar en este día."
                    );
                }
            } catch (error: unknown) {
                if (isMissingHealthPermissionError(error)) {
                    const message =
                        "La app aún no tiene todos los permisos necesarios de Salud para este día.";
                    setPermissionWarning(message);

                    if (source === "manual") {
                        Alert.alert("Permisos faltantes", message);
                    }

                    return;
                }

                const message = safeText(error instanceof Error ? error.message : error);

                if (source === "manual") {
                    Alert.alert("Error", message);
                }

                setPermissionWarning(message);
            }
        },
        [autoBootstrap, availability, date, requestPermissions, workoutDayQuery]
    );

    React.useEffect(() => {
        setAutoBootstrapAttempted(false);
        setPermissionWarning(null);
    }, [date]);

    React.useEffect(() => {
        if (!date) return;
        if (workoutDayQuery.isLoading || workoutDayQuery.isFetching) return;
        if (bootstrapBusy) return;
        if (autoBootstrapAttempted) return;
        if (!missingSleep && !missingSessions) return;

        setAutoBootstrapAttempted(true);
        void runPermissionAwareBootstrap("auto");
    }, [
        date,
        workoutDayQuery.isLoading,
        workoutDayQuery.isFetching,
        bootstrapBusy,
        autoBootstrapAttempted,
        missingSleep,
        missingSessions,
        runPermissionAwareBootstrap,
    ]);

    if (workoutDayQuery.isLoading) {
        return (
            <View style={[styles.center, { backgroundColor: uiColors.background }]}>
                <ActivityIndicator />
                <Text style={[styles.centerText, { color: uiColors.mutedText }]}>Cargando detalle del día...</Text>
            </View>
        );
    }

    if (workoutDayQuery.isError) {
        return (
            <View style={[styles.errorState, { borderColor: uiColors.border, backgroundColor: uiColors.surface }]}>
                <Text style={[styles.errorTitle, { color: uiColors.text }]}>No se pudo cargar el día</Text>
                <Text style={[styles.centerText, { color: uiColors.mutedText }]}>Revisa tu conexión e intenta nuevamente.</Text>
                <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                        void workoutDayQuery.refetch();
                    }}
                    style={({ pressed }) => [
                        styles.retryButton,
                        {
                            borderColor: uiColors.border,
                            backgroundColor: uiColors.background,
                            opacity: pressed ? 0.72 : 1,
                        },
                    ]}
                >
                    <Text style={[styles.retryButtonText, { color: uiColors.text }]}>Reintentar</Text>
                </Pressable>
            </View>
        );
    }

    const sessions = normalizeSessions(day);
    const groups = splitSessionsByKind(sessions);
    const totalDurationSeconds = sumNullable(sessions.map((session) => session.durationSeconds));
    const totalActiveKcal = sumNullable(sessions.map((session) => session.activeKcal));
    const sleepMinutes = day?.sleep?.timeAsleepMinutes ?? null;
    const mediaCount = countMedia(sessions);

    return (
        <View style={styles.container}>
            <MediaViewerModal visible={viewerVisible} item={viewerItem} onClose={closeViewer} />

            <View style={styles.kpiGrid}>
                <KpiCard
                    label="Entrenamiento"
                    value={formatDurationSeconds(totalDurationSeconds)}
                    colors={uiColors}
                />
                <KpiCard
                    label="Kcal activas"
                    value={totalActiveKcal > 0 ? String(totalActiveKcal) : "—"}
                    colors={uiColors}
                />
                <KpiCard
                    label="Sueño"
                    value={typeof sleepMinutes === "number" ? minutesToHhMm(sleepMinutes) : "—"}
                    colors={uiColors}
                />
            </View>

            <View style={[styles.dayOverview, { borderColor: uiColors.border, backgroundColor: uiColors.surface }]}>
                <Text style={[styles.dayOverviewTitle, { color: uiColors.text }]}>Resumen de entrenamiento</Text>
                <View style={styles.overviewValues}>
                    <Text style={[styles.overviewText, { color: uiColors.mutedText }]}>🏋️ Gym: {groups.gym.length}</Text>
                    <Text style={[styles.overviewText, { color: uiColors.mutedText }]}>🚶 Cardio: {groups.cardio.length}</Text>
                    <Text style={[styles.overviewText, { color: uiColors.mutedText }]}>📎 Media: {mediaCount}</Text>
                    {workoutDayQuery.isFetching ? (
                        <Text style={[styles.overviewText, { color: uiColors.mutedText }]}>↻ Actualizando</Text>
                    ) : null}
                </View>
            </View>

            {(bootstrapBusy ||
                autoBootstrap.data?.bootstrappedSleep ||
                autoBootstrap.data?.bootstrappedWorkout ||
                permissionWarning) ? (
                <View style={[styles.bootstrapBanner, { borderColor: uiColors.border, backgroundColor: uiColors.surface }]}>
                    <View style={styles.bootstrapTextGroup}>
                        <Text style={[styles.bootstrapTitle, { color: uiColors.text }]}>Sincronización de Salud</Text>

                        {bootstrapBusy ? (
                            <Text style={[styles.bootstrapText, { color: uiColors.mutedText }]}>Revisando permisos e intentando importar desde {providerLabel}…</Text>
                        ) : permissionWarning ? (
                            <Text style={[styles.bootstrapText, { color: uiColors.mutedText }]}>{permissionWarning}</Text>
                        ) : (
                            <Text style={[styles.bootstrapText, { color: uiColors.mutedText }]}>Se revisó la información disponible desde Salud para este día.</Text>
                        )}

                        <Text style={[styles.permissionLine, { color: uiColors.mutedText }]}>Provider: {providerLabel} · Disponible: {availability ? "Sí" : "No"} · Lectura: {canAttemptBootstrap ? "lista para consultar" : "pendiente"}</Text>
                    </View>

                    {!bootstrapBusy ? (
                        <Pressable
                            accessibilityRole="button"
                            onPress={() => {
                                void runPermissionAwareBootstrap("manual");
                            }}
                            style={({ pressed }) => [
                                styles.retryButton,
                                {
                                    borderColor: uiColors.border,
                                    backgroundColor: uiColors.background,
                                    opacity: pressed ? 0.72 : 1,
                                },
                            ]}
                        >
                            <Text style={[styles.retryButtonText, { color: uiColors.text }]}>Reintentar</Text>
                        </Pressable>
                    ) : (
                        <ActivityIndicator />
                    )}
                </View>
            ) : null}

            <DayNotesSection date={date} />
            <DaySleepSection sleep={day?.sleep ?? null} colors={uiColors} />
            <DaySessionsSection
                date={date}
                sessions={sessions}
                colors={uiColors}
                onOpenMedia={openViewer}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        gap: 12,
    },
    center: {
        minHeight: 220,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    centerText: {
        fontSize: 13,
        fontWeight: "600",
        lineHeight: 18,
        textAlign: "center",
    },
    errorState: {
        minHeight: 220,
        borderWidth: 1,
        borderRadius: 16,
        padding: 18,
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
    },
    errorTitle: {
        fontSize: 16,
        fontWeight: "800",
    },
    kpiGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    kpiCard: {
        flexGrow: 1,
        flexBasis: "30%",
        minWidth: 98,
        minHeight: 70,
        borderWidth: 1,
        borderRadius: 15,
        padding: 12,
        justifyContent: "space-between",
        gap: 8,
    },
    kpiLabel: {
        fontSize: 11,
        fontWeight: "800",
        lineHeight: 15,
    },
    kpiValue: {
        fontSize: 17,
        fontWeight: "800",
        lineHeight: 21,
    },
    dayOverview: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 13,
        gap: 9,
    },
    dayOverviewTitle: {
        fontSize: 14,
        fontWeight: "800",
    },
    overviewValues: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    overviewText: {
        fontSize: 12,
        fontWeight: "800",
    },
    bootstrapBanner: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    bootstrapTextGroup: {
        flex: 1,
        gap: 4,
    },
    bootstrapTitle: {
        fontSize: 13,
        fontWeight: "800",
    },
    bootstrapText: {
        fontSize: 12,
        fontWeight: "600",
        lineHeight: 18,
    },
    permissionLine: {
        fontSize: 11,
        fontWeight: "700",
        lineHeight: 16,
    },
    retryButton: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    retryButtonText: {
        fontSize: 12,
        fontWeight: "800",
    },
});
