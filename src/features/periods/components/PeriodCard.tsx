// src/features/periods/components/PeriodCard.tsx
// Shared mobile card and compact metric tile for the Periods feature.

import React from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

type PeriodCardProps = {
    title?: string;
    subtitle?: string;
    children: React.ReactNode;
    style?: ViewStyle;
    tone?: "default" | "soft" | "accent";
};

export function PeriodCard({
    title,
    subtitle,
    children,
    style,
    tone = "default",
}: PeriodCardProps) {
    const { colors } = useTheme();

    const backgroundColor = tone === "accent"
        ? colors.card
        : tone === "soft"
            ? colors.background
            : colors.surface;

    return (
        <View
            style={[
                styles.card,
                {
                    backgroundColor,
                    borderColor: colors.border,
                },
                style,
            ]}
        >
            {title || subtitle ? (
                <View style={styles.header}>
                    {title ? (
                        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                    ) : null}
                    {subtitle ? (
                        <Text style={[styles.subtitle, { color: colors.mutedText }]}>{subtitle}</Text>
                    ) : null}
                </View>
            ) : null}

            {children}
        </View>
    );
}

type MetricTileProps = {
    label: string;
    value: string;
    helper?: string | null;
    wide?: boolean;
};

export function MetricTile({ label, value, helper, wide = false }: MetricTileProps) {
    const { colors } = useTheme();

    return (
        <View
            style={[
                styles.metric,
                {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                },
                wide ? styles.metricWide : null,
            ]}
        >
            <Text style={[styles.metricLabel, { color: colors.mutedText }]}>{label}</Text>
            <Text style={[styles.metricValue, { color: colors.text }]} numberOfLines={2}>
                {value}
            </Text>
            {helper ? (
                <Text style={[styles.metricHelper, { color: colors.mutedText }]} numberOfLines={2}>
                    {helper}
                </Text>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderWidth: 1,
        borderRadius: 18,
        padding: 14,
        gap: 12,
    },
    header: {
        gap: 3,
    },
    title: {
        fontSize: 18,
        fontWeight: "900",
    },
    subtitle: {
        fontSize: 12,
        lineHeight: 17,
        fontWeight: "700",
    },
    metric: {
        width: "48.5%",
        minHeight: 88,
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 11,
        paddingVertical: 10,
        gap: 5,
    },
    metricWide: {
        width: "100%",
    },
    metricLabel: {
        fontSize: 11,
        lineHeight: 15,
        fontWeight: "800",
    },
    metricValue: {
        fontSize: 17,
        lineHeight: 22,
        fontWeight: "900",
    },
    metricHelper: {
        fontSize: 11,
        lineHeight: 15,
        fontWeight: "700",
    },
});
