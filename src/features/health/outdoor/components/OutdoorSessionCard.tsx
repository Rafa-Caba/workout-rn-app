// src/features/health/outdoor/components/OutdoorSessionCard.tsx

import React from "react";
import { Pressable, Text, View } from "react-native";

import OutdoorSessionBadge from "@/src/features/health/outdoor/components/OutdoorSessionBadge";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { WorkoutSession } from "@/src/types/workoutDay.types";
import {
    buildOutdoorSessionTitleFromWorkoutSession,
    formatOutdoorCalories,
    formatOutdoorDistance,
    formatOutdoorSteps,
} from "@/src/utils/health/outdoor/outdoorSession.helpers";

type Props = {
    session: WorkoutSession;
    onPress: (session: WorkoutSession) => void;
};

function formatDuration(durationSeconds: number | null | undefined): string {
    if (typeof durationSeconds !== "number" || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
        return "—";
    }

    const totalMinutes = Math.round(durationSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }

    return `${minutes} min`;
}

function formatStartTime(startAt: string | null | undefined): string {
    if (!startAt) {
        return "Hora no disponible";
    }

    const date = new Date(startAt);
    if (!Number.isFinite(date.getTime())) {
        return "Hora no disponible";
    }

    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function OutdoorSessionCard({ session, onPress }: Props) {
    const { colors } = useTheme();

    return (
        <Pressable
            onPress={() => onPress(session)}
            style={({ pressed }) => ({
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 16,
                padding: 14,
                backgroundColor: colors.surface,
                gap: 10,
                opacity: pressed ? 0.84 : 1,
                transform: [{ scale: pressed ? 0.99 : 1 }],
            })}
        >
            <View
                style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 10,
                }}
            >
                <View style={{ flex: 1, gap: 6 }}>
                    {session.activityType ? (
                        <OutdoorSessionBadge activityType={session.activityType} />
                    ) : null}

                    <Text
                        style={{
                            fontSize: 17,
                            fontWeight: "900",
                            color: colors.text,
                        }}
                    >
                        {buildOutdoorSessionTitleFromWorkoutSession(session)}
                    </Text>

                    <Text style={{ color: colors.mutedText }}>
                        {formatStartTime(session.startAt)}
                    </Text>
                </View>

                {session.hasRoute ? (
                    <View
                        style={{
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: colors.border,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            backgroundColor: colors.background,
                        }}
                    >
                        <Text style={{ fontSize: 12, fontWeight: "800", color: colors.text }}>
                            Ruta disponible
                        </Text>
                    </View>
                ) : null}
            </View>

            <View
                style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                }}
            >
                <View
                    style={{
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        backgroundColor: colors.background,
                    }}
                >
                    <Text style={{ color: colors.text, fontWeight: "700" }}>
                        Tiempo: {formatDuration(session.durationSeconds)}
                    </Text>
                </View>

                <View
                    style={{
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        backgroundColor: colors.background,
                    }}
                >
                    <Text style={{ color: colors.text, fontWeight: "700" }}>
                        Distancia: {formatOutdoorDistance(session.distanceKm)}
                    </Text>
                </View>

                <View
                    style={{
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        backgroundColor: colors.background,
                    }}
                >
                    <Text style={{ color: colors.text, fontWeight: "700" }}>
                        Kcal: {formatOutdoorCalories(session.activeKcal)}
                    </Text>
                </View>

                <View
                    style={{
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        backgroundColor: colors.background,
                    }}
                >
                    <Text style={{ color: colors.text, fontWeight: "700" }}>
                        Pasos: {formatOutdoorSteps(session.steps)}
                    </Text>
                </View>
            </View>
        </Pressable>
    );
}

export default OutdoorSessionCard;