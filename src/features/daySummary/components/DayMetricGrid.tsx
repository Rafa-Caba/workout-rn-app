// src/features/daySummary/components/DayMetricGrid.tsx

/**
 * Reusable responsive metric primitives for the unified day detail.
 * Two-column rows wrap naturally on narrow phones without relying on fixed
 * pixel widths.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { DayUiColors } from "./dayDetail.helpers";

type RowItemProps = {
    label: string;
    value: string;
    colors: DayUiColors;
    emphasized?: boolean;
};

type PillProps = {
    label: string;
    colors: DayUiColors;
};

export function DayTwoColGrid({ children }: { children: React.ReactNode }) {
    return <View style={styles.grid}>{children}</View>;
}

export function DayRowItem({ label, value, colors, emphasized = false }: RowItemProps) {
    return (
        <View
            style={[
                styles.rowItem,
                {
                    borderColor: colors.border,
                    backgroundColor: emphasized ? colors.background : colors.surface,
                },
            ]}
        >
            <Text style={[styles.rowLabel, { color: colors.mutedText }]} numberOfLines={2}>
                {label}
            </Text>
            <Text style={[styles.rowValue, { color: colors.text }]} numberOfLines={2}>
                {value || "—"}
            </Text>
        </View>
    );
}

export function DayPill({ label, colors }: PillProps) {
    return (
        <View style={[styles.pill, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Text style={[styles.pillText, { color: colors.mutedText }]} numberOfLines={1}>
                {label}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    rowItem: {
        flexGrow: 1,
        flexBasis: "47%",
        minWidth: 128,
        borderWidth: 1,
        borderRadius: 13,
        paddingHorizontal: 11,
        paddingVertical: 9,
        justifyContent: "center",
        minHeight: 62,
    },
    rowLabel: {
        fontSize: 11,
        fontWeight: "800",
        lineHeight: 15,
    },
    rowValue: {
        marginTop: 4,
        fontSize: 14,
        fontWeight: "800",
        lineHeight: 18,
    },
    pill: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    pillText: {
        fontSize: 12,
        fontWeight: "800",
    },
});
