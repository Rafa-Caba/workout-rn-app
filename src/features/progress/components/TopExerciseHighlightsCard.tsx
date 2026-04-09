// src/features/progress/components/TopExerciseHighlightsCard.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { WorkoutExerciseHighlightsItem } from "@/src/types/workoutProgress.types";

type TopExerciseHighlightsCardProps = {
    items: WorkoutExerciseHighlightsItem[];
};

export function TopExerciseHighlightsCard({
    items,
}: TopExerciseHighlightsCardProps) {
    const { colors } = useTheme();

    if (!items.length) {
        return (
            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={[styles.title, { color: colors.text }]}>Highlights por ejercicio</Text>
                <Text style={{ color: colors.mutedText }}>Aún no hay mejoras comparables suficientes.</Text>
            </View>
        );
    }

    return (
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.title, { color: colors.text }]}>Highlights por ejercicio</Text>

            <View style={{ gap: 8 }}>
                {items.map((item) => (
                    <View
                        key={item.id}
                        style={[
                            styles.row,
                            { borderColor: colors.border, backgroundColor: colors.background },
                        ]}
                    >
                        <Text style={{ color: colors.text, fontWeight: "900" }}>{item.title}</Text>
                        <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                            {item.message}
                        </Text>
                    </View>
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
        fontWeight: "900",
    },
    row: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 10,
        gap: 4,
    },
});