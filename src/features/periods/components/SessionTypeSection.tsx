// src/features/periods/components/SessionTypeSection.tsx
// Session-type distribution cards for month, week, and custom ranges.

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import {
    formatStatValue,
    sessionTypeKey,
} from "@/src/features/periods/utils/periods.helpers";
import type { WeekBySessionTypeRow } from "@/src/utils/summaryPeriods/weeksExplorer";

import { PeriodCard } from "./PeriodCard";

type Props = {
    rows: readonly WeekBySessionTypeRow[];
};

export function SessionTypeSection({ rows }: Props) {
    const { colors } = useTheme();

    if (rows.length === 0) return null;

    return (
        <PeriodCard title="Tipos de sesión">
            <View style={styles.rows}>
                {rows.map((row, index) => (
                    <View
                        key={sessionTypeKey(row, index)}
                        style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                        <Text style={[styles.title, { color: colors.text }]}>{row.sessionType}</Text>
                        <View style={styles.metrics}>
                            <Text style={[styles.metric, { color: colors.mutedText }]}>Sesiones: <Text style={{ color: colors.text }}>{formatStatValue(row.sessionsCount)}</Text></Text>
                            <Text style={[styles.metric, { color: colors.mutedText }]}>Duración (min): <Text style={{ color: colors.text }}>{formatStatValue(row.durationMinutes)}</Text></Text>
                            <Text style={[styles.metric, { color: colors.mutedText }]}>Kcal: <Text style={{ color: colors.text }}>{formatStatValue(row.activeKcal)}</Text></Text>
                            {row.mediaCount !== undefined ? (
                                <Text style={[styles.metric, { color: colors.mutedText }]}>Media: <Text style={{ color: colors.text }}>{formatStatValue(row.mediaCount)}</Text></Text>
                            ) : null}
                        </View>
                    </View>
                ))}
            </View>
        </PeriodCard>
    );
}

const styles = StyleSheet.create({
    rows: {
        gap: 9,
    },
    row: {
        borderWidth: 1,
        borderRadius: 14,
        padding: 11,
        gap: 8,
    },
    title: {
        fontSize: 14,
        fontWeight: "900",
    },
    metrics: {
        flexDirection: "row",
        flexWrap: "wrap",
        columnGap: 14,
        rowGap: 5,
    },
    metric: {
        fontSize: 12,
        lineHeight: 17,
        fontWeight: "700",
    },
});
