// src/features/progress/components/ProgressExerciseTableCard.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { WorkoutProgressExerciseTableRow } from "@/src/types/workoutProgress.types";
import { ProgressExerciseRow } from "./ProgressExerciseRow";

type ProgressExerciseTableCardProps = {
    rows: WorkoutProgressExerciseTableRow[];
};

export function ProgressExerciseTableCard({
    rows,
}: ProgressExerciseTableCardProps) {
    const { colors } = useTheme();

    if (!rows.length) {
        return (
            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={[styles.title, { color: colors.text }]}>Top ejercicios</Text>
                <Text style={{ color: colors.mutedText }}>Todavía no hay comparaciones suficientes.</Text>
            </View>
        );
    }

    return (
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.title, { color: colors.text }]}>Top ejercicios</Text>

            <View style={{ gap: 8 }}>
                {rows.map((row) => (
                    <ProgressExerciseRow key={row.exerciseKey} row={row} />
                ))}
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
});