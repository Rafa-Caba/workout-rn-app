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
 *
 * Permission-aware behavior:
 * - if health permissions are still pending, the screen requests them
 *   before attempting the auto-bootstrap
 * - if permissions are missing/denied, it shows a friendly banner
 * - retry also re-requests permissions before importing
 */

import React from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";

import type { MediaViewerItem } from "@/src/features/components/media/MediaViewerModal";
import { MediaViewerModal } from "@/src/features/components/media/MediaViewerModal";

import { useDayAutoBootstrap } from "@/src/hooks/health/useDayAutoBootstrap";
import { useHealthPermissions } from "@/src/hooks/health/useHealthPermissions";
import { useWorkoutDay } from "@/src/hooks/workout/useWorkoutDay";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { HealthPermissionsStatus } from "@/src/types/health.types";
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

    /**
     * We care about sleep + workout/fitness-style reads for Day auto-bootstrap.
     * If provider returns more specific keys, we filter to the health-related reads.
     * If not, we fall back to all returned permission states.
     */
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
        message.includes("permission")
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

    const {
        availability,
        provider,
        permissionsStatus,
        isCheckingAvailability,
        isRequestingPermissions,
        requestPermissions,
    } = useHealthPermissions();

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
                    setPermissionWarning(
                        "Todavía faltan permisos de Salud para importar sueño o sesiones del dispositivo."
                    );

                    if (source === "manual") {
                        Alert.alert(
                            "Permisos requeridos",
                            "Todavía faltan permisos de Salud para importar sueño o sesiones del dispositivo."
                        );
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
            } catch (error) {
                if (isMissingHealthPermissionError(error)) {
                    setPermissionWarning(
                        "La app aún no tiene todos los permisos necesarios de Salud para este día."
                    );

                    if (source === "manual") {
                        Alert.alert(
                            "Permisos faltantes",
                            "La app aún no tiene todos los permisos necesarios de Salud para este día."
                        );
                    }

                    return;
                }

                const message = safeText(
                    error instanceof Error ? error.message : error
                );

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
                <Text style={[styles.centerText, { color: uiColors.mutedText }]}>
                    Cargando día...
                </Text>
            </View>
        );
    }

    if (workoutDayQuery.isError) {
        return (
            <View style={[styles.center, { backgroundColor: uiColors.background }]}>
                <Text style={[styles.centerText, { color: uiColors.mutedText }]}>
                    No se pudo cargar el día.
                </Text>
            </View>
        );
    }

    if (!day) {
        return (
            <View style={[styles.center, { backgroundColor: uiColors.background }]}>
                <Text style={[styles.centerText, { color: uiColors.mutedText }]}>
                    No hay datos para este día.
                </Text>
            </View>
        );
    }

    const sessions = normalizeSessions(day);
    const sessionsCount = sessions.length;
    const mediaCount = countMedia(sessions);

    return (
        <View style={styles.container}>
            <MediaViewerModal visible={viewerVisible} item={viewerItem} onClose={closeViewer} />

            <View
                style={[
                    styles.topRow,
                    { borderColor: uiColors.border, backgroundColor: uiColors.surface },
                ]}
            >
                <View style={styles.topRowLeft}>
                    <Text style={[styles.topRowTitle, { color: uiColors.text }]}>📅 Fecha</Text>
                    <Text style={[styles.topRowValue, { color: uiColors.mutedText }]}>
                        {day.date || "—"}
                    </Text>
                </View>

                <View style={styles.pills}>
                    <DayPill label={`🏋️ Sesiones: ${sessionsCount}`} colors={uiColors} />
                    <DayPill label={`🖼️ Media: ${mediaCount}`} colors={uiColors} />
                </View>
            </View>

            {(bootstrapBusy ||
                autoBootstrap.data?.bootstrappedSleep ||
                autoBootstrap.data?.bootstrappedWorkout ||
                permissionWarning) ? (
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

                        {bootstrapBusy ? (
                            <Text style={[styles.bootstrapText, { color: uiColors.mutedText }]}>
                                Revisando permisos e intentando importar desde {providerLabel}…
                            </Text>
                        ) : permissionWarning ? (
                            <Text style={[styles.bootstrapText, { color: uiColors.mutedText }]}>
                                {permissionWarning}
                            </Text>
                        ) : (
                            <Text style={[styles.bootstrapText, { color: uiColors.mutedText }]}>
                                {autoBootstrap.data?.bootstrappedSleep ||
                                    autoBootstrap.data?.bootstrappedWorkout
                                    ? "Se importó información disponible desde Salud para este día."
                                    : "No hubo datos nuevos para importar."}
                            </Text>
                        )}

                        <Text style={[styles.permissionLine, { color: uiColors.mutedText }]}>
                            Provider: {providerLabel} · Disponible: {availability ? "Sí" : "No"} · Permisos:{" "}
                            {canAttemptBootstrap ? "Concedidos" : "Pendientes"}
                        </Text>
                    </View>

                    {!bootstrapBusy ? (
                        <Pressable
                            onPress={() => {
                                void runPermissionAwareBootstrap("manual");
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
                            <Text style={{ color: uiColors.text, fontWeight: "800" }}>
                                Reintentar
                            </Text>
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
    container: { flex: 1, gap: 12 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
    centerText: { fontSize: 13, fontWeight: "600" },
    topRow: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },
    topRowLeft: { flex: 1 },
    topRowTitle: { fontSize: 12, fontWeight: "900" },
    topRowValue: { marginTop: 4, fontSize: 13, fontWeight: "700" },
    pills: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    bootstrapBanner: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    bootstrapTitle: { fontSize: 13, fontWeight: "900" },
    bootstrapText: { fontSize: 12, fontWeight: "600", lineHeight: 18 },
    permissionLine: { fontSize: 11, fontWeight: "700", lineHeight: 16 },
});