// src/features/periods/components/MonthWeekBreakdownSection.tsx
// Mobile month-by-week distribution using the same Web ISO-week rollups.

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { CalendarDayFull } from "@/src/types/workoutDay.types";
import { buildMonthWeekRows } from "@/src/utils/summaryPeriods/monthlySummary";
import {
    formatDurationSeconds,
    formatMinutes,
    formatRounded,
} from "@/src/features/periods/utils/periods.helpers";

import { PeriodCard } from "./PeriodCard";

type Props = {
    days: readonly CalendarDayFull[];
    loading: boolean;
    hasError: boolean;
};

export function MonthWeekBreakdownSection({ days, loading, hasError }: Props) {
    const { colors } = useTheme();
    const rows = React.useMemo(() => buildMonthWeekRows(days, "es"), [days]);

    return (
        <PeriodCard
            title="Distribución por semana"
            subtitle="Muestra cómo se repartieron el entrenamiento y el sueño dentro del mes."
        >
            {loading ? (
                <Text style={[styles.message, { color: colors.mutedText }]}>Cargando distribución mensual…</Text>
            ) : null}

            {hasError ? (
                <Text style={[styles.message, { color: colors.danger }]}>No se pudo cargar el detalle mensual.</Text>
            ) : null}

            {!loading && !hasError && rows.length === 0 ? (
                <Text style={[styles.message, { color: colors.mutedText }]}>Este mes todavía no tiene registros.</Text>
            ) : null}

            {!loading && !hasError && rows.length > 0 ? (
                <View style={styles.rows}>
                    {rows.map((row) => (
                        <View
                            key={row.key}
                            style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        >
                            <Text style={[styles.rowTitle, { color: colors.text }]}>📅 {row.label}</Text>
                            <View style={styles.metricGrid}>
                                <Text style={[styles.metric, { color: colors.mutedText }]}>🏋️ Sesiones: <Text style={{ color: colors.text }}>{row.sessionsCount}</Text></Text>
                                <Text style={[styles.metric, { color: colors.mutedText }]}>⏱ Duración: <Text style={{ color: colors.text }}>{formatDurationSeconds(row.durationSeconds)}</Text></Text>
                                <Text style={[styles.metric, { color: colors.mutedText }]}>🔥 Kcal: <Text style={{ color: colors.text }}>{formatRounded(row.activeKcal)}</Text></Text>
                                <Text style={[styles.metric, { color: colors.mutedText }]}>🛏 Sueño prom: <Text style={{ color: colors.text }}>{formatMinutes(row.avgSleepMinutes)}</Text></Text>
                            </View>
                        </View>
                    ))}
                </View>
            ) : null}
        </PeriodCard>
    );
}

const styles = StyleSheet.create({
    message: {
        fontSize: 13,
        lineHeight: 18,
        fontWeight: "700",
    },
    rows: {
        gap: 9,
    },
    row: {
        borderWidth: 1,
        borderRadius: 14,
        padding: 11,
        gap: 9,
    },
    rowTitle: {
        fontSize: 14,
        fontWeight: "900",
    },
    metricGrid: {
        gap: 5,
    },
    metric: {
        fontSize: 12,
        lineHeight: 17,
        fontWeight: "700",
    },
});
