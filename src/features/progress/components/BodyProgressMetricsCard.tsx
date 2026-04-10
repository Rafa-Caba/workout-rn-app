// src/features/progress/components/BodyProgressMetricsCard.tsx

import React from "react";
import { Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { BodyProgressMetric } from "@/src/types/bodyProgress.types";

function formatMetricValue(value: number | null, unit: "kg" | "percent" | "cm"): string {
    if (value === null || Number.isNaN(value)) {
        return "—";
    }

    if (unit === "percent") {
        return `${value.toFixed(1)}%`;
    }

    if (unit === "cm") {
        return `${value.toFixed(1)} cm`;
    }

    return `${value.toFixed(1)} kg`;
}

function formatDelta(metric: BodyProgressMetric): string {
    if (metric.deltaVsPrevious === null && metric.percentDeltaVsPrevious === null) {
        return "Sin comparación";
    }

    if (metric.unit === "percent") {
        const value = metric.deltaVsPrevious ?? 0;
        const prefix = value > 0 ? "+" : "";
        return `${prefix}${value.toFixed(1)} pts`;
    }

    if (metric.percentDeltaVsPrevious !== null) {
        const value = metric.percentDeltaVsPrevious;
        const prefix = value > 0 ? "+" : "";
        return `${prefix}${value.toFixed(1)}%`;
    }

    return "Sin comparación";
}

function getTone(metric: BodyProgressMetric): "positive" | "neutral" | "attention" {
    if (metric.deltaVsPrevious === null || Math.abs(metric.deltaVsPrevious) < 0.0001) {
        return "neutral";
    }

    if (metric.isPositiveWhenUp) {
        return metric.deltaVsPrevious > 0 ? "positive" : "attention";
    }

    return metric.deltaVsPrevious < 0 ? "positive" : "attention";
}

type Props = {
    title: string;
    subtitle: string;
    metrics: BodyProgressMetric[];
};

export function BodyProgressMetricsCard({ title, subtitle, metrics }: Props) {
    const { colors } = useTheme();

    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 16,
                padding: 12,
                gap: 10,
                backgroundColor: colors.surface,
            }}
        >
            <View style={{ gap: 2 }}>
                <Text style={{ color: colors.text, fontWeight: "800", fontSize: 17 }}>
                    {title}
                </Text>
                <Text style={{ color: colors.mutedText }}>{subtitle}</Text>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {metrics.map((metric) => {
                    const tone = getTone(metric);
                    const toneColor =
                        tone === "positive"
                            ? colors.primary
                            : tone === "attention"
                                ? "#d97706"
                                : colors.mutedText;

                    return (
                        <View
                            key={metric.key}
                            style={{
                                width: "48%",
                                borderWidth: 1,
                                borderColor: colors.border,
                                borderRadius: 12,
                                padding: 10,
                                gap: 4,
                                backgroundColor: colors.background,
                            }}
                        >
                            <Text style={{ color: colors.mutedText, fontSize: 12, fontWeight: "700" }}>
                                {metric.label}
                            </Text>
                            <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}>
                                {formatMetricValue(metric.currentLatest, metric.unit)}
                            </Text>
                            <Text style={{ color: toneColor, fontSize: 12, fontWeight: "800" }}>
                                {formatDelta(metric)}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}