// src/features/progress/components/ProgressMetricsSection.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { WorkoutProgressMetric } from "@/src/types/workoutProgress.types";
import {
    formatMetricDelta,
    formatMetricValue,
    getTrendTone,
} from "./progressFormatters";

type ProgressMetricsSectionProps = {
    title: string;
    subtitle: string;
    metrics: WorkoutProgressMetric[];
};

export function ProgressMetricsSection({
    title,
    subtitle,
    metrics,
}: ProgressMetricsSectionProps) {
    const { colors } = useTheme();

    return (
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <View style={{ gap: 2 }}>
                <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                <Text style={{ color: colors.mutedText }}>{subtitle}</Text>
            </View>

            <View style={styles.grid}>
                {metrics.map((metric) => {
                    const tone = getTrendTone(metric.delta, metric.isPositiveWhenUp);

                    const toneColor =
                        tone === "positive"
                            ? colors.primary
                            : tone === "attention"
                                ? "#d97706"
                                : colors.mutedText;

                    return (
                        <View
                            key={metric.key}
                            style={[
                                styles.metricCard,
                                { borderColor: colors.border, backgroundColor: colors.background },
                            ]}
                        >
                            <Text style={{ color: colors.mutedText, fontSize: 12, fontWeight: "700" }}>
                                {metric.shortLabel ?? metric.label}
                            </Text>
                            <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}>
                                {formatMetricValue(metric)}
                            </Text>
                            <Text style={{ color: toneColor, fontSize: 12, fontWeight: "800" }}>
                                {formatMetricDelta(metric)}
                            </Text>
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
        fontWeight: "800",
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    metricCard: {
        width: "48%",
        borderWidth: 1,
        borderRadius: 12,
        padding: 10,
        gap: 4,
    },
});