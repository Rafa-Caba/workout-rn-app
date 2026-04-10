// src/features/progress/components/ProgressExercisePreviewCard.tsx
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import DashboardCard from "@/src/features/dashboard/components/DashboardCard";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { WorkoutProgressOverviewResponse } from "@/src/types/workoutProgress.types";
import { formatExerciseBasisLabel } from "./progressFormatters";

type ProgressExercisePreviewCardProps = {
    data: WorkoutProgressOverviewResponse | null;
    isLoading?: boolean;
};

export function ProgressExercisePreviewCard({
    data,
    isLoading = false,
}: ProgressExercisePreviewCardProps) {
    const { colors } = useTheme();

    const rows = data?.exerciseTable ?? [];

    return (
        <DashboardCard
            title="Progreso"
            subtitle="Preview rápido de las mejores mejoras del periodo"
        >
            {isLoading ? (
                <Text style={{ color: colors.mutedText }}>Cargando progreso...</Text>
            ) : rows.length ? (
                <View style={{ gap: 8 }}>
                    {rows.slice(0, 3).map((row) => (
                        <View
                            key={row.exerciseKey}
                            style={[
                                styles.row,
                                { borderColor: colors.border, backgroundColor: colors.background },
                            ]}
                        >
                            <View style={{ flex: 1, gap: 2 }}>
                                <Text style={{ color: colors.text, fontWeight: "800" }}>
                                    {row.exerciseLabel}
                                </Text>
                                <Text style={{ color: colors.mutedText, fontSize: 12, fontWeight: "700" }}>
                                    {formatExerciseBasisLabel(row.basis)}
                                </Text>
                            </View>

                            <Text style={{ color: colors.primary, fontWeight: "800" }}>
                                {row.improvementPct !== null
                                    ? `${row.improvementPct > 0 ? "+" : ""}${row.improvementPct.toFixed(1)}%`
                                    : "—"}
                            </Text>
                        </View>
                    ))}

                    <Pressable
                        onPress={() => router.push("/progress")}
                        style={({ pressed }) => [
                            styles.button,
                            {
                                borderColor: colors.border,
                                backgroundColor: colors.surface,
                                opacity: pressed ? 0.92 : 1,
                            },
                        ]}
                    >
                        <Text style={{ color: colors.text, fontWeight: "800" }}>
                            Ver sección completa
                        </Text>
                    </Pressable>
                </View>
            ) : (
                <View style={{ gap: 8 }}>
                    <Text style={{ color: colors.mutedText }}>
                        Aún no hay datos comparables suficientes para mostrar preview.
                    </Text>

                    <Pressable
                        onPress={() => router.push("/progress")}
                        style={({ pressed }) => [
                            styles.button,
                            {
                                borderColor: colors.border,
                                backgroundColor: colors.surface,
                                opacity: pressed ? 0.92 : 1,
                            },
                        ]}
                    >
                        <Text style={{ color: colors.text, fontWeight: "800" }}>
                            Abrir progreso
                        </Text>
                    </Pressable>
                </View>
            )}
        </DashboardCard>
    );
}

const styles = StyleSheet.create({
    row: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 10,
        flexDirection: "row",
        gap: 10,
        alignItems: "center",
    },
    button: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        alignItems: "center",
        justifyContent: "center",
    },
});