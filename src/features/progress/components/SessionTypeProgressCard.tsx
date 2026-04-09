// src/features/progress/components/SessionTypeProgressCard.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { WorkoutSessionTypeProgressItem } from "@/src/types/workoutProgress.types";
import { formatMetricDelta, formatMetricValue } from "./progressFormatters";

type SessionTypeProgressCardProps = {
    items: WorkoutSessionTypeProgressItem[];
};

export function SessionTypeProgressCard({
    items,
}: SessionTypeProgressCardProps) {
    const { colors } = useTheme();

    return (
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.title, { color: colors.text }]}>Progreso por tipo de sesión</Text>

            <View style={{ gap: 8 }}>
                {items.length ? (
                    items.slice(0, 8).map((item) => (
                        <View
                            key={item.sessionType}
                            style={[
                                styles.row,
                                { borderColor: colors.border, backgroundColor: colors.background },
                            ]}
                        >
                            <View style={{ flex: 1, gap: 2 }}>
                                <Text style={{ color: colors.text, fontWeight: "800" }}>
                                    {item.sessionType}
                                </Text>
                                <Text style={{ color: colors.mutedText, fontWeight: "700", fontSize: 12 }}>
                                    {formatMetricValue(item.sessionsCount)} · {formatMetricDelta(item.sessionsCount)}
                                </Text>
                            </View>

                            <View style={{ alignItems: "flex-end", gap: 2 }}>
                                <Text style={{ color: colors.text, fontWeight: "800", fontSize: 12 }}>
                                    Duración: {formatMetricValue(item.durationSeconds)}
                                </Text>
                                <Text style={{ color: colors.text, fontWeight: "800", fontSize: 12 }}>
                                    Kcal: {formatMetricValue(item.activeKcal)}
                                </Text>
                                {item.completionPct ? (
                                    <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 12 }}>
                                        Cumplimiento: {formatMetricValue(item.completionPct)}
                                    </Text>
                                ) : null}
                            </View>
                        </View>
                    ))
                ) : (
                    <Text style={{ color: colors.mutedText }}>
                        No hay tipos de sesión comparables todavía.
                    </Text>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 12,
        gap: 10,
    },
    title: {
        fontSize: 17,
        fontWeight: "800",
    },
    row: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 10,
        flexDirection: "row",
        gap: 10,
        alignItems: "center",
    },
});