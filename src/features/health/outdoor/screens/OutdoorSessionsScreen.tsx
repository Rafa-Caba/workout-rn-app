// src/features/health/outdoor/screens/OutdoorSessionsScreen.tsx

import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import OutdoorEmptyState from "@/src/features/health/outdoor/components/OutdoorEmptyState";
import OutdoorSessionCard from "@/src/features/health/outdoor/components/OutdoorSessionCard";
import { useOutdoorBootstrap } from "@/src/hooks/health/outdoor/useOutdoorBootstrap";
import { useOutdoorPermissions } from "@/src/hooks/health/outdoor/useOutdoorPermissions";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { ISODate, WorkoutSession } from "@/src/types/workoutDay.types";
import { groupOutdoorSessionsByActivityType } from "@/src/utils/health/outdoor/outdoorSession.grouping";
import {
    formatOutdoorCalories,
    formatOutdoorDistance,
    formatOutdoorSteps,
} from "@/src/utils/health/outdoor/outdoorSession.helpers";

function getTodayIsoDate(): ISODate {
    return new Date().toISOString().slice(0, 10) as ISODate;
}

function formatDuration(durationSeconds: number): string {
    const totalMinutes = Math.round(durationSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }

    return `${minutes} min`;
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
            <Text style={{ fontSize: 16, fontWeight: "900", color: colors.text }}>
                {props.value}
            </Text>
        </View>
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
            <Text style={{ fontSize: 20, fontWeight: "900", color: colors.text }}>
                {props.title}
            </Text>
            {props.subtitle ? (
                <Text style={{ color: colors.mutedText }}>{props.subtitle}</Text>
            ) : null}
        </View>
    );
}

export function OutdoorSessionsScreen() {
    const params = useLocalSearchParams<{ date?: string }>();
    const router = useRouter();
    const { colors } = useTheme();

    const date = (typeof params.date === "string" && params.date.trim().length > 0
        ? params.date
        : getTodayIsoDate()) as ISODate;

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
            <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 24, fontWeight: "900", color: colors.text }}>
                    Walk + Running
                </Text>
                <Text style={{ color: colors.mutedText }}>
                    Outdoor del día {date}
                </Text>
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
                    <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text }}>
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
                        <Text style={{ fontWeight: "900", color: colors.primaryText }}>
                            Dar permisos
                        </Text>
                    </Pressable>
                </View>
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
                        <Text style={{ fontSize: 22, fontWeight: "900", color: colors.text }}>
                            Dashboard general
                        </Text>
                        <Text style={{ color: colors.mutedText }}>
                            Resumen outdoor del día
                        </Text>
                    </View>

                    <Pressable
                        onPress={() => {
                            void outdoor.resync();
                        }}
                        style={({ pressed }) => ({
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                            opacity: pressed ? 0.82 : 1,
                        })}
                    >
                        <Text style={{ fontWeight: "900", color: colors.text }}>
                            Resync
                        </Text>
                    </Pressable>
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
                            dashboardTotals.totalDurationSeconds
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
                        description="No encontramos caminatas importadas para este día."
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
                        description="No encontramos carreras importadas para este día."
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