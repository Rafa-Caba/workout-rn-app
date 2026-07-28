// src/features/periods/components/PeriodDailyDetailSection.tsx
// Mobile daily training/sleep detail for weekly and custom-range summaries.

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { CalendarDayFull } from "@/src/types/workoutDay.types";
import { buildTrainingDayRows, formatWeekDayLabel } from "@/src/utils/summaryPeriods/weeklySummary";
import {
    buildSleepDayRows,
    formatDurationSeconds,
    formatHr,
    formatMinutes,
    formatRounded,
    isFiniteNumber,
    type PeriodDetailTab,
} from "@/src/features/periods/utils/periods.helpers";

import { PeriodCard } from "./PeriodCard";

type Props = {
    days: readonly CalendarDayFull[];
    loading: boolean;
    hasError: boolean;
    period: "week" | "range";
};

const DETAIL_TABS: readonly PeriodDetailTab[] = ["training", "sleep"];

function formatPercent(value: number | null): string {
    return isFiniteNumber(value) ? `${Math.round(value)}%` : "—";
}

function formatNumber(value: number | null): string {
    return isFiniteNumber(value) ? String(Math.round(value * 100) / 100) : "—";
}

export function PeriodDailyDetailSection({ days, loading, hasError, period }: Props) {
    const { colors } = useTheme();
    const [tab, setTab] = React.useState<PeriodDetailTab>("training");
    const trainingRows = React.useMemo(() => buildTrainingDayRows(days), [days]);
    const sleepRows = React.useMemo(() => buildSleepDayRows(days), [days]);

    return (
        <PeriodCard
            title="Detalle por día"
            subtitle={period === "range"
                ? "Compara entrenamiento y sueño durante el rango seleccionado."
                : "Compara entrenamiento y sueño durante la semana."}
        >
            <View style={[styles.tabs, { backgroundColor: colors.background, borderColor: colors.border }]}>
                {DETAIL_TABS.map((value) => {
                    const active = value === tab;
                    return (
                        <Pressable
                            key={value}
                            onPress={() => setTab(value)}
                            style={({ pressed }) => [
                                styles.tab,
                                {
                                    backgroundColor: active ? colors.primary : "transparent",
                                    opacity: pressed ? 0.86 : 1,
                                },
                            ]}
                        >
                            <Text style={[styles.tabText, { color: active ? colors.primaryText : colors.text }]}>
                                {value === "training" ? "Entrenamiento" : "Sueño"}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {loading ? (
                <Text style={[styles.message, { color: colors.mutedText }]}>Cargando detalle diario…</Text>
            ) : null}

            {hasError ? (
                <Text style={[styles.message, { color: colors.danger }]}>No se pudo cargar el detalle diario.</Text>
            ) : null}

            {!loading && !hasError && tab === "training" ? (
                trainingRows.length === 0 ? (
                    <Text style={[styles.message, { color: colors.mutedText }]}>No hay sesiones de entrenamiento en este periodo.</Text>
                ) : (
                    <View style={styles.rows}>
                        {trainingRows.map((row) => (
                            <View key={row.date} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <Text style={[styles.rowTitle, { color: colors.text }]}>{formatWeekDayLabel(row.date, "es")}</Text>
                                <View style={styles.metrics}>
                                    <Text style={[styles.metric, { color: colors.mutedText }]}>🏋️ Sesiones: <Text style={{ color: colors.text }}>{row.sessionsCount}</Text></Text>
                                    <Text style={[styles.metric, { color: colors.mutedText }]}>⏱ Duración: <Text style={{ color: colors.text }}>{formatDurationSeconds(row.durationSeconds)}</Text></Text>
                                    <Text style={[styles.metric, { color: colors.mutedText }]}>🔥 Kcal: <Text style={{ color: colors.text }}>{formatRounded(row.activeKcal)}</Text></Text>
                                    <Text style={[styles.metric, { color: colors.mutedText }]}>❤️ HR prom/máx: <Text style={{ color: colors.text }}>{formatHr(row.avgHr, row.maxHr)}</Text></Text>
                                    <Text style={[styles.metric, { color: colors.mutedText }]}>📎 Media: <Text style={{ color: colors.text }}>{row.mediaCount}</Text></Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )
            ) : null}

            {!loading && !hasError && tab === "sleep" ? (
                sleepRows.length === 0 ? (
                    <Text style={[styles.message, { color: colors.mutedText }]}>No hay registros de sueño en este periodo.</Text>
                ) : (
                    <View style={styles.rows}>
                        {sleepRows.map((row) => (
                            <View key={row.date} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <Text style={[styles.rowTitle, { color: colors.text }]}>{formatWeekDayLabel(row.date, "es")}</Text>
                                <View style={styles.metrics}>
                                    <Text style={[styles.metric, { color: colors.mutedText }]}>🛌 Total: <Text style={{ color: colors.text }}>{formatMinutes(row.totalMinutes)}</Text></Text>
                                    <Text style={[styles.metric, { color: colors.mutedText }]}>🏆 Score: <Text style={{ color: colors.text }}>{formatNumber(row.score)}</Text></Text>
                                    <Text style={[styles.metric, { color: colors.mutedText }]}>💤 Eficiencia: <Text style={{ color: colors.text }}>{formatPercent(row.efficiencyPct)}</Text></Text>
                                    <Text style={[styles.metric, { color: colors.mutedText }]}>🔁 Readiness: <Text style={{ color: colors.text }}>{formatNumber(row.readiness)}</Text></Text>
                                    <Text style={[styles.metric, { color: colors.mutedText }]}>🧠 REM: <Text style={{ color: colors.text }}>{formatPercent(row.remPct)}</Text></Text>
                                    <Text style={[styles.metric, { color: colors.mutedText }]}>🌙 Deep: <Text style={{ color: colors.text }}>{formatPercent(row.deepPct)}</Text></Text>
                                    <Text style={[styles.metric, { color: colors.mutedText }]}>💤 Core: <Text style={{ color: colors.text }}>{formatMinutes(row.coreMinutes)}</Text></Text>
                                    <Text style={[styles.metric, { color: colors.mutedText }]}>⏱ Despierto: <Text style={{ color: colors.text }}>{formatMinutes(row.awakeMinutes)}</Text></Text>
                                    <Text style={[styles.metric, { color: colors.mutedText }]}>📡 Fuente: <Text style={{ color: colors.text }}>{row.source ?? "—"}</Text></Text>
                                    <Text style={[styles.metric, { color: colors.mutedText }]}>⌚ Dispositivo: <Text style={{ color: colors.text }}>{row.sourceDevice ?? "—"}</Text></Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )
            ) : null}
        </PeriodCard>
    );
}

const styles = StyleSheet.create({
    tabs: {
        flexDirection: "row",
        borderWidth: 1,
        borderRadius: 13,
        padding: 3,
        gap: 3,
    },
    tab: {
        flex: 1,
        minHeight: 40,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    tabText: {
        fontSize: 12,
        fontWeight: "900",
    },
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
        gap: 8,
    },
    rowTitle: {
        fontSize: 14,
        fontWeight: "900",
    },
    metrics: {
        gap: 5,
    },
    metric: {
        fontSize: 12,
        lineHeight: 17,
        fontWeight: "700",
    },
});
