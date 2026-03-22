// src/features/daySummary/components/DayMetricGrid.tsx

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { DayUiColors } from "./dayDetail.helpers";

type RowItemProps = {
    label: string;
    value: string;
    colors: DayUiColors;
};

type PillProps = {
    label: string;
    colors: DayUiColors;
};

export function DayTwoColGrid({ children }: { children: React.ReactNode }) {
    return <View style={styles.grid}>{children}</View>;
}

export function DayRowItem({ label, value, colors }: RowItemProps) {
    return (
        <View style={[styles.rowItem, { borderColor: colors.border }]}>
            <Text style={[styles.rowLabel, { color: colors.mutedText }]} numberOfLines={1}>
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
        <View style={[styles.pill, { borderColor: colors.border, backgroundColor: colors.surface }]}>
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
        gap: 10,
    },
    rowItem: {
        width: "48%",
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
        justifyContent: "center",
    },
    rowLabel: {
        fontSize: 12,
        fontWeight: "900",
    },
    rowValue: {
        marginTop: 6,
        fontSize: 14,
        fontWeight: "900",
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