// src/features/progress/components/ProgressHeroCard.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type {
    WorkoutProgressComparisonRange,
    WorkoutProgressHero,
} from "@/src/types/workoutProgress.types";
import { formatRangeLabel } from "./progressFormatters";

type ProgressHeroCardProps = {
    hero: WorkoutProgressHero;
    range: WorkoutProgressComparisonRange;
    compareRange: WorkoutProgressComparisonRange | null;
};

export function ProgressHeroCard({
    hero,
    range,
    compareRange,
}: ProgressHeroCardProps) {
    const { colors } = useTheme();

    return (
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <View style={{ gap: 4 }}>
                <Text style={[styles.title, { color: colors.text }]}>{hero.title}</Text>
                <Text style={{ color: colors.mutedText, fontWeight: "700" }}>{hero.subtitle}</Text>
            </View>

            <View style={[styles.rangeBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Text style={[styles.rangeLabel, { color: colors.text }]}>Rango actual</Text>
                <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                    {formatRangeLabel(range)}
                </Text>

                {compareRange ? (
                    <>
                        <View style={{ height: 6 }} />
                        <Text style={[styles.rangeLabel, { color: colors.text }]}>Comparado contra</Text>
                        <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                            {formatRangeLabel(compareRange)}
                        </Text>
                    </>
                ) : null}
            </View>

            {hero.items.length ? (
                <View style={styles.itemsRow}>
                    {hero.items.map((item) => (
                        <View
                            key={item}
                            style={[
                                styles.itemChip,
                                { borderColor: colors.border, backgroundColor: colors.background },
                            ]}
                        >
                            <Text style={{ color: colors.text, fontWeight: "800", fontSize: 12 }}>
                                {item}
                            </Text>
                        </View>
                    ))}
                </View>
            ) : null}

            <View style={{ gap: 6 }}>
                <Text style={{ color: colors.text, fontWeight: "800" }}>{hero.message}</Text>

                {hero.bullets.map((bullet) => (
                    <Text key={bullet} style={{ color: colors.mutedText, fontWeight: "700" }}>
                        • {bullet}
                    </Text>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        gap: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: "800",
    },
    rangeBox: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 10,
    },
    rangeLabel: {
        fontSize: 12,
        fontWeight: "800",
    },
    itemsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    itemChip: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 7,
    },
});