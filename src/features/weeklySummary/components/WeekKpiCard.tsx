// src/features/weeklySummary/components/WeekKpiCard.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

type Props = {
    title: string;
    value: string | number;
    subtitle?: string;
};

export function WeekKpiCard({ title, value, subtitle }: Props) {
    const { colors } = useTheme();

    return (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.mutedText }]} numberOfLines={1}>
                {title}
            </Text>

            <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>
                {String(value)}
            </Text>

            {subtitle ? (
                <Text style={[styles.subtitle, { color: colors.mutedText }]} numberOfLines={1}>
                    {subtitle}
                </Text>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flex: 1,
        minWidth: "48%",
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 6,
    },
    title: { fontSize: 12, fontWeight: "900" },
    value: { fontSize: 20, fontWeight: "900" },
    subtitle: { fontSize: 12, fontWeight: "700" },
});