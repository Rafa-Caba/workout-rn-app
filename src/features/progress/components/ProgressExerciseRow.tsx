// src/features/progress/components/ProgressExerciseRow.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { WorkoutProgressExerciseTableRow } from "@/src/types/workoutProgress.types";
import {
    formatExerciseBasisLabel,
    formatUnitValue,
} from "./progressFormatters";

type ProgressExerciseRowProps = {
    row: WorkoutProgressExerciseTableRow;
};

export function ProgressExerciseRow({ row }: ProgressExerciseRowProps) {
    const { colors } = useTheme();

    const improvementText =
        row.improvementPct !== null
            ? `${row.improvementPct > 0 ? "+" : ""}${row.improvementPct.toFixed(1)}%`
            : row.improvementAbsolute !== null
                ? `${row.improvementAbsolute > 0 ? "+" : ""}${formatUnitValue(
                    row.improvementAbsolute,
                    row.unit
                )}`
                : "—";

    return (
        <View style={[styles.row, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: colors.text, fontWeight: "900" }}>{row.exerciseLabel}</Text>
                <Text style={{ color: colors.mutedText, fontWeight: "700", fontSize: 12 }}>
                    {formatExerciseBasisLabel(row.basis)} · {row.periodLabel}
                </Text>
            </View>

            <View style={{ alignItems: "flex-end", gap: 2 }}>
                <Text style={{ color: colors.primary, fontWeight: "900" }}>{improvementText}</Text>
                <Text style={{ color: colors.mutedText, fontWeight: "700", fontSize: 12 }}>
                    {formatUnitValue(row.previous, row.unit)} → {formatUnitValue(row.current, row.unit)}
                </Text>
            </View>
        </View>
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
});