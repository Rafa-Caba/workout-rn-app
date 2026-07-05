// src/features/health/cardio/components/CardioSessionCard.tsx

import React from "react";
import { Pressable, Text, View } from "react-native";

import CardioSessionBadge from "@/src/features/health/cardio/components/CardioSessionBadge";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { WorkoutSession } from "@/src/types/workoutDay.types";
import {
    buildCardioSessionTitleFromWorkoutSession,
    formatCardioCalories,
    formatCardioDistance,
    formatCardioSteps,
    getCardioEnvironmentLabel,
    resolveWorkoutSessionCardioEnvironment,
} from "@/src/utils/health/cardio/cardioSession.helpers";

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

export function CardioSessionCard({ session, onPress }: Props) {
    const { colors } = useTheme();
    const environment = resolveWorkoutSessionCardioEnvironment(session);

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
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        {session.activityType ? (
                            <CardioSessionBadge activityType={session.activityType} />
                        ) : null}

                        <View
                            style={{
                                alignSelf: "flex-start",
                                paddingHorizontal: 10,
                                paddingVertical: 5,
                                borderRadius: 999,
                                borderWidth: 1,
                                borderColor: colors.border,
                                backgroundColor: colors.background,
                            }}
                        >
                            <Text style={{ fontSize: 12, fontWeight: "900", color: colors.text }}>
                                {getCardioEnvironmentLabel(environment)}
                            </Text>
                        </View>
                    </View>

                    <Text
                        style={{
                            fontSize: 17,
                            fontWeight: "900",
                            color: colors.text,
                        }}
                    >
                        {buildCardioSessionTitleFromWorkoutSession(session)}
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
                        Distancia: {formatCardioDistance(session.distanceKm)}
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
                        Kcal: {formatCardioCalories(session.activeKcal)}
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
                        Pasos: {formatCardioSteps(session.steps)}
                    </Text>
                </View>
            </View>
        </Pressable>
    );
}

export default CardioSessionCard;
