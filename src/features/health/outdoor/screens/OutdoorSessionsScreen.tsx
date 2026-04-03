// /src/features/health/outdoor/screens/OutdoorSessionsScreen.tsx

import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { DatePickerField } from "@/src/features/components/DatePickerField";
import OutdoorEmptyState from "@/src/features/health/outdoor/components/OutdoorEmptyState";
import OutdoorSessionCard from "@/src/features/health/outdoor/components/OutdoorSessionCard";
import { useOutdoorBootstrap } from "@/src/hooks/health/outdoor/useOutdoorBootstrap";
import { useOutdoorPermissions } from "@/src/hooks/health/outdoor/useOutdoorPermissions";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { ISODate, WorkoutSession } from "@/src/types/workoutDay.types";
import {
    formatFlexibleDateLabel,
    getLocalTodayIsoDate,
} from "@/src/utils/dates/dateDisplay";
import { groupOutdoorSessionsByActivityType } from "@/src/utils/health/outdoor/outdoorSession.grouping";
import {
    formatOutdoorCalories,
    formatOutdoorDistance,
    formatOutdoorSteps,
} from "@/src/utils/health/outdoor/outdoorSession.helpers";

function formatDuration(durationSeconds: number): string {
    const totalMinutes = Math.round(durationSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }

    return `${minutes} min`;
}

function resolveDateParam(value: string | string[] | undefined): ISODate {
    if (typeof value === "string" && value.trim().length > 0) {
        return value as ISODate;
    }

    return getLocalTodayIsoDate();
}

function MetricsPill(props: { label: string; value: string }) {
    const { colors } = useTheme();

    return (
        <View
            style={{
                width: "48%",
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                padding: 12,
                backgroundColor: colors.surface,
                gap: 4,
            }}
        >
            <Text style={{ fontSize: 12, color: colors.mutedText }}>{props.label}</Text>
            <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text }}>
                {props.value}
            </Text>
        </View>
    );
}

function ActionButton(props: {
    label: string;
    onPress: () => void;
    primary?: boolean;
}) {
    const { colors } = useTheme();

    return (
        <Pressable
            onPress={props.onPress}
            style={({ pressed }) => ({
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: props.primary ? colors.primary : colors.border,
                backgroundColor: props.primary ? colors.primary : colors.background,
                opacity: pressed ? 0.82 : 1,
            })}
        >
            <Text
                style={{
                    fontWeight: "800",
                    color: props.primary ? colors.primaryText : colors.text,
                }}
            >
                {props.label}
            </Text>
        </Pressable>
    );
}

function computeDashboardTotals(sessions: WorkoutSession[]) {
    let totalDistanceKm = 0;
    let totalSteps = 0;
    let totalActiveKcal = 0;
    let totalDurationSeconds = 0;
    let sessionsWithDistance = 0;
    let sessionsWithSteps = 0;
    let sessionsWithKcal = 0;
    let sessionsWithDuration = 0;

    for (const session of sessions) {
        if (typeof session.distanceKm === "number" && Number.isFinite(session.distanceKm)) {
            totalDistanceKm += session.distanceKm;
            sessionsWithDistance += 1;
        }

        if (typeof session.steps === "number" && Number.isFinite(session.steps)) {
            totalSteps += session.steps;
            sessionsWithSteps += 1;
        }

        if (typeof session.activeKcal === "number" && Number.isFinite(session.activeKcal)) {
            totalActiveKcal += session.activeKcal;
            sessionsWithKcal += 1;
        }

        if (
            typeof session.durationSeconds === "number" &&
            Number.isFinite(session.durationSeconds)
        ) {
            totalDurationSeconds += session.durationSeconds;
            sessionsWithDuration += 1;
        }
    }

    return {
        sessionsCount: sessions.length,
        totalDistanceKm: sessionsWithDistance > 0 ? totalDistanceKm : null,
        totalSteps: sessionsWithSteps > 0 ? totalSteps : null,
        totalActiveKcal: sessionsWithKcal > 0 ? totalActiveKcal : null,
        totalDurationSeconds: sessionsWithDuration > 0 ? totalDurationSeconds : null,
    };
}

function SectionTitle(props: { title: string; subtitle?: string }) {
    const { colors } = useTheme();

    return (
        <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text }}>
                {props.title}
            </Text>
            {props.subtitle ? (
                <Text style={{ color: colors.mutedText }}>{props.subtitle}</Text>
            ) : null}
        </View>
    );
}

function ManualFallbackCard(props: {
    dateLabel: string;
    onPress: () => void;
}) {
    const { colors } = useTheme();

    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 16,
                padding: 16,
                backgroundColor: colors.surface,
                gap: 10,
            }}
        >
            <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text }}>
                ¿No hubo datos desde Health?
            </Text>

            <Text style={{ color: colors.mutedText, lineHeight: 20 }}>
                Puedes capturar manualmente una sesión outdoor para {props.dateLabel} usando el
                mismo patrón de métricas que una importada.
            </Text>

            <View style={{ alignItems: "flex-start" }}>
                <ActionButton
                    label="Capturar sesión manual"
                    onPress={props.onPress}
                    primary
                />
            </View>
        </View>
    );
}

export function OutdoorSessionsScreen() {
    const params = useLocalSearchParams<{ date?: string | string[] }>();
    const router = useRouter();
    const { colors } = useTheme();

    const date = resolveDateParam(params.date);

    const displayDate = React.useMemo(() => {
        return formatFlexibleDateLabel(date, "es");
    }, [date]);

    const permissions = useOutdoorPermissions();

    const outdoor = useOutdoorBootstrap({
        date,
        includeRoutes: false,
        autoBootstrap: true,
    });

    const groupedSessions = React.useMemo(() => {
        return groupOutdoorSessionsByActivityType(outdoor.sessions);
    }, [outdoor.sessions]);

    const dashboardTotals = React.useMemo(() => {
        return computeDashboardTotals(outdoor.sessions);
    }, [outdoor.sessions]);

    function handleDateChange(nextDate: string) {
        router.setParams({ date: nextDate });
    }

    function goToToday() {
        router.setParams({ date: getLocalTodayIsoDate() });
    }

    function openManualSessionForm() {
        router.push({
            pathname: "/(app)/calendar/outdoor/manual",
            params: {
                date,
            },
        });
    }

    function openSessionDetails(session: WorkoutSession) {
        router.push({
            pathname: "/(app)/calendar/outdoor/session/[date]/[sessionId]",
            params: {
                date,
                sessionId: session.id,
            },
        });
    }

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
        >
            <View style={{ gap: 10 }}>
                <View style={{ gap: 4 }}>
                    <Text style={{ fontSize: 24, fontWeight: "800", color: colors.text }}>
                        Walk + Running
                    </Text>
                    <Text style={{ color: colors.mutedText }}>
                        Outdoor del día {displayDate}
                    </Text>
                </View>

                <View
                    style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 16,
                        padding: 12,
                        backgroundColor: colors.surface,
                        gap: 10,
                    }}
                >
                    <DatePickerField
                        label="Día a consultar"
                        value={date}
                        onChange={handleDateChange}
                        displayFormat="MMM dd, yyyy"
                    />

                    <View
                        style={{
                            flexDirection: "row",
                            justifyContent: "flex-end",
                            flexWrap: "wrap",
                            gap: 10,
                        }}
                    >
                        <ActionButton label="Ir a hoy" onPress={goToToday} />
                        <ActionButton
                            label="Agregar manual"
                            onPress={openManualSessionForm}
                            primary
                        />
                    </View>
                </View>
            </View>

            {!permissions.isGranted ? (
                <View
                    style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 16,
                        padding: 16,
                        backgroundColor: colors.surface,
                        gap: 10,
                    }}
                >
                    <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>
                        Permisos de Outdoor
                    </Text>
                    <Text style={{ color: colors.mutedText }}>
                        Necesitamos permisos de HealthKit / Health Connect para leer caminatas y carreras.
                    </Text>

                    <Pressable
                        onPress={() => {
                            void permissions.requestPermissions();
                        }}
                        style={({ pressed }) => ({
                            alignSelf: "flex-start",
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 12,
                            backgroundColor: colors.primary,
                            borderWidth: 1,
                            borderColor: colors.primary,
                            opacity: pressed ? 0.82 : 1,
                        })}
                    >
                        <Text style={{ fontWeight: "800", color: colors.primaryText }}>
                            Dar permisos
                        </Text>
                    </Pressable>
                </View>
            ) : null}

            {!outdoor.loading && outdoor.sessions.length === 0 ? (
                <ManualFallbackCard
                    dateLabel={displayDate}
                    onPress={openManualSessionForm}
                />
            ) : null}

            <View
                style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 16,
                    padding: 16,
                    backgroundColor: colors.surface,
                    gap: 14,
                }}
            >
                <View
                    style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 10,
                    }}
                >
                    <View style={{ flex: 1, gap: 4 }}>
                        <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>
                            Dashboard general
                        </Text>
                        <Text style={{ color: colors.mutedText }}>
                            Resumen outdoor del día
                        </Text>
                    </View>

                    <ActionButton
                        label="Resync"
                        onPress={() => {
                            void outdoor.resync();
                        }}
                    />
                </View>

                {outdoor.loading ? (
                    <Text style={{ color: colors.mutedText }}>Cargando outdoor…</Text>
                ) : null}

                {outdoor.error ? (
                    <Text style={{ color: colors.danger ?? colors.text }}>{outdoor.error}</Text>
                ) : null}

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                    <MetricsPill
                        label="Sesiones"
                        value={String(dashboardTotals.sessionsCount)}
                    />
                    <MetricsPill
                        label="Distancia total"
                        value={formatOutdoorDistance(dashboardTotals.totalDistanceKm)}
                    />
                    <MetricsPill
                        label="Pasos totales"
                        value={formatOutdoorSteps(dashboardTotals.totalSteps)}
                    />
                    <MetricsPill
                        label="Kcal activas"
                        value={formatOutdoorCalories(dashboardTotals.totalActiveKcal)}
                    />
                    <MetricsPill
                        label="Tiempo total"
                        value={
                            dashboardTotals.totalDurationSeconds != null
                                ? formatDuration(dashboardTotals.totalDurationSeconds)
                                : "—"
                        }
                    />
                </View>
            </View>

            <View style={{ gap: 12 }}>
                <SectionTitle
                    title="Walking"
                    subtitle="Sesiones de caminata detectadas para este día"
                />

                {groupedSessions.walking.length === 0 ? (
                    <OutdoorEmptyState
                        title="No hubo sesiones de walking"
                        description="No encontramos caminatas importadas o manuales para este día."
                        onRetry={() => {
                            void outdoor.resync();
                        }}
                    />
                ) : (
                    groupedSessions.walking.map((session) => (
                        <OutdoorSessionCard
                            key={session.id}
                            session={session}
                            onPress={openSessionDetails}
                        />
                    ))
                )}
            </View>

            <View style={{ gap: 12 }}>
                <SectionTitle
                    title="Running"
                    subtitle="Sesiones de carrera detectadas para este día"
                />

                {groupedSessions.running.length === 0 ? (
                    <OutdoorEmptyState
                        title="No hubo sesiones de running"
                        description="No encontramos carreras importadas o manuales para este día."
                        onRetry={() => {
                            void outdoor.resync();
                        }}
                    />
                ) : (
                    groupedSessions.running.map((session) => (
                        <OutdoorSessionCard
                            key={session.id}
                            session={session}
                            onPress={openSessionDetails}
                        />
                    ))
                )}
            </View>
        </ScrollView>
    );
}

export default OutdoorSessionsScreen;