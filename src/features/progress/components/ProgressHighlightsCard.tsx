// src/features/progress/components/ProgressHighlightsCard.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { WorkoutProgressHighlightsItem } from "@/src/types/workoutProgress.types";

type ProgressHighlightsCardProps = {
    title?: string;
    items: WorkoutProgressHighlightsItem[];
};

export function ProgressHighlightsCard({
    title = "Highlights",
    items,
}: ProgressHighlightsCardProps) {
    const { colors } = useTheme();

    return (
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

            <View style={{ gap: 10 }}>
                {items.map((item) => {
                    const badgeColor =
                        item.tone === "positive"
                            ? colors.primary
                            : item.tone === "attention"
                                ? "#d97706"
                                : colors.mutedText;

                    return (
                        <View
                            key={item.id}
                            style={[
                                styles.row,
                                { borderColor: colors.border, backgroundColor: colors.background },
                            ]}
                        >
                            <View style={[styles.dot, { backgroundColor: badgeColor }]} />
                            <View style={{ flex: 1, gap: 2 }}>
                                <Text style={{ color: colors.text, fontWeight: "900" }}>
                                    {item.title}
                                </Text>
                                <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                                    {item.message}
                                </Text>
                            </View>
                        </View>
                    );
                })}
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
        alignItems: "flex-start",
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 999,
        marginTop: 5,
    },
});