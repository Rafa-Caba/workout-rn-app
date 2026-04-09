// src/features/progress/components/ExerciseProgressSection.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type {
    WorkoutExerciseComparisonBasis,
    WorkoutExerciseProgressItem,
} from "@/src/types/workoutProgress.types";
import { ExerciseProgressFilterBar } from "./ExerciseProgressFilterBar";
import {
    formatExerciseBasisLabel,
    formatUnitValue,
} from "./progressFormatters";

type ExerciseProgressSectionProps = {
    items: WorkoutExerciseProgressItem[];
};

type FilterValue = WorkoutExerciseComparisonBasis | "all";

export function ExerciseProgressSection({
    items,
}: ExerciseProgressSectionProps) {
    const { colors } = useTheme();
    const [filter, setFilter] = React.useState<FilterValue>("all");

    const filteredItems = React.useMemo(() => {
        if (filter === "all") {
            return items;
        }

        return items.filter((item) => item.bestMetricKey === filter);
    }, [filter, items]);

    return (
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <View style={{ gap: 6 }}>
                <Text style={[styles.title, { color: colors.text }]}>Detalle por ejercicio</Text>
                <Text style={{ color: colors.mutedText }}>
                    Progreso por movimiento comparando el periodo actual vs previo.
                </Text>
            </View>

            <ExerciseProgressFilterBar value={filter} onChange={setFilter} />

            <View style={{ gap: 8 }}>
                {filteredItems.length ? (
                    filteredItems.slice(0, 10).map((item) => {
                        const bestMetric = item.metrics.find(
                            (metric) => metric.key === item.bestMetricKey
                        );

                        return (
                            <View
                                key={item.exerciseKey}
                                style={[
                                    styles.row,
                                    { borderColor: colors.border, backgroundColor: colors.background },
                                ]}
                            >
                                <View style={{ flex: 1, gap: 2 }}>
                                    <Text style={{ color: colors.text, fontWeight: "900" }}>
                                        {item.exerciseLabel}
                                    </Text>
                                    <Text style={{ color: colors.mutedText, fontWeight: "700", fontSize: 12 }}>
                                        {item.bestMetricKey
                                            ? formatExerciseBasisLabel(item.bestMetricKey)
                                            : "Sin base comparable"}
                                    </Text>
                                </View>

                                <View style={{ alignItems: "flex-end", gap: 2 }}>
                                    <Text style={{ color: colors.primary, fontWeight: "900" }}>
                                        {bestMetric?.percentDelta !== null && bestMetric?.percentDelta !== undefined
                                            ? `${bestMetric.percentDelta > 0 ? "+" : ""}${bestMetric.percentDelta.toFixed(1)}%`
                                            : "—"}
                                    </Text>

                                    <Text style={{ color: colors.mutedText, fontWeight: "700", fontSize: 12 }}>
                                        {bestMetric
                                            ? `${formatUnitValue(bestMetric.previous, bestMetric.unit)} → ${formatUnitValue(bestMetric.current, bestMetric.unit)}`
                                            : "Sin comparación"}
                                    </Text>
                                </View>
                            </View>
                        );
                    })
                ) : (
                    <Text style={{ color: colors.mutedText }}>
                        No hay ejercicios para el filtro seleccionado.
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
        fontWeight: "900",
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