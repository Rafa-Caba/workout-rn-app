// src/features/insights/components/InsightsMetricCard.tsx
// Responsive compact KPI card used by streak and recovery summaries.

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

type InsightsMetricCardProps = {
    label: string;
    value: string | number;
};

export function InsightsMetricCard({ label, value }: InsightsMetricCardProps) {
    const { colors } = useTheme();

    return (
        <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.mutedText }]}>{label}</Text>
            <Text style={[styles.value, { color: colors.text }]} numberOfLines={2}>
                {String(value)}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flexGrow: 1,
        flexBasis: "47%",
        minWidth: "47%",
        minHeight: 78,
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 11,
        justifyContent: "space-between",
        gap: 6,
    },
    label: {
        fontSize: 11,
        fontWeight: "800",
    },
    value: {
        fontSize: 17,
        fontWeight: "900",
    },
});
