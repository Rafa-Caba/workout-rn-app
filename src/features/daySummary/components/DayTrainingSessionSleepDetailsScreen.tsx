// /src/features/daySummary/screens/DayTrainingSessionSleepDetailsScreen.tsx

/**
 * DayTrainingSessionSleepDetailsScreen
 *
 * Detailed "Día" tab:
 * - date summary header
 * - sleep section
 * - gym/training sessions section
 * - outdoor sessions section
 *
 * This screen auto-bootstraps missing health data:
 * - if sleep is missing -> tries sleep bootstrap
 * - if gym/training sessions are missing -> tries minimal workout bootstrap
 * - if outdoor sessions are missing -> tries outdoor bootstrap
 * - it never overwrites existing data
 *
 * Permission-aware behavior:
 * - if health permissions are still pending, the screen requests them
 *   before attempting the base auto-bootstrap
 * - outdoor permissions are handled by the outdoor hook/module
 */

import { useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";

import type { MediaViewerItem } from "@/src/features/components/media/MediaViewerModal";
import { MediaViewerModal } from "@/src/features/components/media/MediaViewerModal";
import { DayTrainingBlockSection } from "@/src/features/daySummary/components/DayTrainingBlockSection";
import OutdoorEmptyState from "@/src/features/health/outdoor/components/OutdoorEmptyState";
import OutdoorSessionCard from "@/src/features/health/outdoor/components/OutdoorSessionCard";

import { useOutdoorBootstrap } from "@/src/hooks/health/outdoor/useOutdoorBootstrap";
import { useDayAutoBootstrap } from "@/src/hooks/health/useDayAutoBootstrap";
import { useHealthPermissions } from "@/src/hooks/health/useHealthPermissions";
import { useWorkoutDay } from "@/src/hooks/workout/useWorkoutDay";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { HealthPermissionsStatus } from "@/src/types/health/health.types";
import type { WorkoutDay, WorkoutSession } from "@/src/types/workoutDay.types";
import { isOutdoorActivityType } from "@/src/utils/health/outdoor/outdoorSession.helpers";

import { DayPill } from "../components/DayMetricGrid";
import {
    countMedia,
    normalizeSessions,
    type DayUiColors,
} from "../components/dayDetail.helpers";
import { DaySleepSection } from "./DaySleepSection";

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

function hasMeaningfulGymSessions(day: WorkoutDay | null): boolean {
    const sessions = Array.isArray(day?.training?.sessions) ? day.training.sessions : [];

    return sessions.some((session) => !isOutdoorActivityType(session.activityType));
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
        message.includes("permission")
    );
}

function splitSessions(
    day: WorkoutDay | null
): { gymSessions: WorkoutSession[]; outdoorSessionsFromDay: WorkoutSession[] } {
    const sessions = normalizeSessions(day);

    const gymSessions = sessions.filter((session) => !isOutdoorActivityType(session.activityType));
    const outdoorSessionsFromDay = sessions.filter((session) =>
        isOutdoorActivityType(session.activityType)
    );

    return { gymSessions, outdoorSessionsFromDay };
}

function DaySubsection(props: {
    title: string;
    subtitle?: string;
    colors: DayUiColors;
    right?: React.ReactNode;
    children: React.ReactNode;
}) {
    const { colors } = props;

    return (
        <View
            style={[
                styles.subsection,
                {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                },
            ]}
        >
            <View style={styles.subsectionHeader}>
                <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[styles.subsectionTitle, { color: colors.text }]}>
                        {props.title}
                    </Text>

                    {props.subtitle ? (
                        <Text style={[styles.subsectionSubtitle, { color: colors.mutedText }]}>
                            {props.subtitle}
                        </Text>
                    ) : null}
                </View>

                {props.right}
            </View>

            {props.children}
        </View>
    );
}

export function DayTrainingSessionSleepDetailsScreen({ date }: Props) {
    const router = useRouter();
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
    const outdoorBootstrap = useOutdoorBootstrap({
        date,
        includeRoutes: false,
        autoBootstrap: true,
    });

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
    const missingGymSessions = !hasMeaningfulGymSessions(day);

    const providerLabel =
        provider === "healthkit"
            ? "HealthKit"
            : provider === "health-connect"
                ? "Health Connect"
                : "Salud";

    const canAttemptBootstrap = availability && hasRelevantHealthReadPermissions(permissionsStatus);
    const bootstrapBusy =
        autoBootstrap.isPending || isCheckingAvailability || isRequestingPermissions;

    const { gymSessions, outdoorSessionsFromDay } = React.useMemo(
        () => splitSessions(day),
        [day]
    );

    const outdoorSessions = React.useMemo<WorkoutSession[]>(() => {
        if (outdoorBootstrap.sessions.length > 0) {
            return outdoorBootstrap.sessions;
        }

        return outdoorSessionsFromDay;
    }, [outdoorBootstrap.sessions, outdoorSessionsFromDay]);

    const mediaCount = countMedia(gymSessions);

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
        if (!missingSleep && !missingGymSessions) return;

        setAutoBootstrapAttempted(true);

        void runPermissionAwareBootstrap("auto");
    }, [
        date,
        workoutDayQuery.isLoading,
        workoutDayQuery.isFetching,
        bootstrapBusy,
        autoBootstrapAttempted,
        missingSleep,
        missingGymSessions,
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
                    <DayPill label={`🏋️ Gym/Training: ${gymSessions.length}`} colors={uiColors} />
                    <DayPill label={`🚶 Outdoor: ${outdoorSessions.length}`} colors={uiColors} />
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

            <DayTrainingBlockSection
                day={day}
                sessions={gymSessions}
                colors={uiColors}
                onOpenMedia={openViewer}
            />

            <DaySubsection
                title="🚶 Outdoor"
                subtitle="Walking + Running importados para este día"
                colors={uiColors}
                right={
                    <Pressable
                        onPress={() => {
                            void outdoorBootstrap.resync();
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
                            Resync
                        </Text>
                    </Pressable>
                }
            >
                {outdoorBootstrap.loading ? (
                    <Text style={{ color: uiColors.mutedText }}>Cargando outdoor…</Text>
                ) : null}

                {outdoorBootstrap.error ? (
                    <Text style={{ color: uiColors.mutedText }}>
                        {outdoorBootstrap.error}
                    </Text>
                ) : null}

                {outdoorSessions.length === 0 ? (
                    <OutdoorEmptyState
                        title="Sin sesiones outdoor"
                        description="No encontramos caminatas o carreras importadas para este día."
                        onRetry={() => {
                            void outdoorBootstrap.resync();
                        }}
                    />
                ) : (
                    <View style={{ gap: 10 }}>
                        {outdoorSessions.map((session) => (
                            <OutdoorSessionCard
                                key={session.id}
                                session={session}
                                onPress={(selectedSession) => {
                                    router.push({
                                        pathname: "/(app)/calendar/outdoor/session/[date]/[sessionId]",
                                        params: {
                                            date,
                                            sessionId: selectedSession.id,
                                        },
                                    });
                                }}
                            />
                        ))}
                    </View>
                )}
            </DaySubsection>
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
    subsection: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 12,
        gap: 10,
    },
    subsectionHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
    },
    subsectionTitle: {
        fontSize: 16,
        fontWeight: "900",
    },
    subsectionSubtitle: {
        fontSize: 12,
        fontWeight: "600",
    },
});