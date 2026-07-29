// src/features/periods/components/PeriodDailyDetailSection.tsx
// Mobile daily training/sleep detail for weekly and custom-range summaries.
// Metrics use a compact two-column grid; source/device rows remain full width.

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
    buildSleepDayRows,
    formatDurationSeconds,
    formatHr,
    formatMinutes,
    formatRounded,
    isFiniteNumber,
    type PeriodDetailTab,
} from "@/src/features/periods/utils/periods.helpers";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { CalendarDayFull } from "@/src/types/workoutDay.types";
import {
    buildTrainingDayRows,
    formatWeekDayLabel,
} from "@/src/utils/summaryPeriods/weeklySummary";

import { PeriodCard } from "./PeriodCard";

type Props = {
    days: readonly CalendarDayFull[];
    loading: boolean;
    hasError: boolean;
    period: "week" | "range";
};

type DailyMetric = {
    key: string;
    icon: string;
    label: string;
    value: string;
    fullWidth?: boolean;
};

type MetricGridProps = {
    metrics: readonly DailyMetric[];
};

const DETAIL_TABS: readonly PeriodDetailTab[] = ["training", "sleep"];

function formatPercent(value: number | null): string {
    return isFiniteNumber(value) ? `${Math.round(value)}%` : "—";
}

function formatNumber(value: number | null): string {
    return isFiniteNumber(value) ? String(Math.round(value * 100) / 100) : "—";
}

/**
 * Renders period metrics in a responsive two-column grid.
 * Odd or explicitly full-width metrics occupy the whole available row.
 */
function MetricGrid({ metrics }: MetricGridProps) {
    const { colors } = useTheme();

    return (
        <View style={styles.metricGrid}>
            {metrics.map((metric) => (
                <View
                    key={metric.key}
                    style={[
                        styles.metricCell,
                        metric.fullWidth ? styles.metricCellFull : null,
                    ]}
                >
                    <Text
                        adjustsFontSizeToFit
                        minimumFontScale={0.82}
                        numberOfLines={1}
                        style={[styles.metric, { color: colors.mutedText }]}
                    >
                        {metric.icon} {metric.label}:{" "}
                        <Text style={{ color: colors.text }}>{metric.value}</Text>
                    </Text>
                </View>
            ))}
        </View>
    );
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
                        {trainingRows.map((row) => {
                            const metrics: readonly DailyMetric[] = [
                                {
                                    key: "sessions",
                                    icon: "🏋️",
                                    label: "Sesiones",
                                    value: String(row.sessionsCount),
                                },
                                {
                                    key: "duration",
                                    icon: "⏱",
                                    label: "Duración",
                                    value: formatDurationSeconds(row.durationSeconds),
                                },
                                {
                                    key: "active-kcal",
                                    icon: "🔥",
                                    label: "Kcal",
                                    value: formatRounded(row.activeKcal),
                                },
                                {
                                    key: "heart-rate",
                                    icon: "❤️",
                                    label: "HR prom/máx",
                                    value: formatHr(row.avgHr, row.maxHr),
                                },
                                {
                                    key: "media",
                                    icon: "📎",
                                    label: "Media",
                                    value: String(row.mediaCount),
                                    fullWidth: true,
                                },
                            ];

                            return (
                                <View
                                    key={row.date}
                                    style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                >
                                    <Text style={[styles.rowTitle, { color: colors.text }]}>
                                        {formatWeekDayLabel(row.date, "es")}
                                    </Text>
                                    <MetricGrid metrics={metrics} />
                                </View>
                            );
                        })}
                    </View>
                )
            ) : null}

            {!loading && !hasError && tab === "sleep" ? (
                sleepRows.length === 0 ? (
                    <Text style={[styles.message, { color: colors.mutedText }]}>No hay registros de sueño en este periodo.</Text>
                ) : (
                    <View style={styles.rows}>
                        {sleepRows.map((row) => {
                            const metrics: readonly DailyMetric[] = [
                                {
                                    key: "total",
                                    icon: "🛌",
                                    label: "Total",
                                    value: formatMinutes(row.totalMinutes),
                                },
                                {
                                    key: "score",
                                    icon: "🏆",
                                    label: "Score",
                                    value: formatNumber(row.score),
                                },
                                {
                                    key: "efficiency",
                                    icon: "💤",
                                    label: "Eficiencia",
                                    value: formatPercent(row.efficiencyPct),
                                },
                                {
                                    key: "readiness",
                                    icon: "🔁",
                                    label: "Readiness",
                                    value: formatNumber(row.readiness),
                                },
                                {
                                    key: "rem",
                                    icon: "🧠",
                                    label: "REM",
                                    value: formatPercent(row.remPct),
                                },
                                {
                                    key: "deep",
                                    icon: "🌙",
                                    label: "Deep",
                                    value: formatPercent(row.deepPct),
                                },
                                {
                                    key: "core",
                                    icon: "💤",
                                    label: "Core",
                                    value: formatMinutes(row.coreMinutes),
                                },
                                {
                                    key: "awake",
                                    icon: "⏱",
                                    label: "Despierto",
                                    value: formatMinutes(row.awakeMinutes),
                                },
                                {
                                    key: "source",
                                    icon: "📡",
                                    label: "Fuente",
                                    value: row.source ?? "—",
                                    fullWidth: true,
                                },
                                {
                                    key: "device",
                                    icon: "⌚",
                                    label: "Dispositivo",
                                    value: row.sourceDevice ?? "—",
                                    fullWidth: true,
                                },
                            ];

                            return (
                                <View
                                    key={row.date}
                                    style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                >
                                    <Text style={[styles.rowTitle, { color: colors.text }]}>
                                        {formatWeekDayLabel(row.date, "es")}
                                    </Text>
                                    <MetricGrid metrics={metrics} />
                                </View>
                            );
                        })}
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
    metricGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        columnGap: 10,
        rowGap: 5,
    },
    metricCell: {
        flexBasis: "47%",
        flexGrow: 1,
        flexShrink: 1,
        minWidth: 0,
    },
    metricCellFull: {
        flexBasis: "100%",
    },
    metric: {
        fontSize: 12,
        lineHeight: 17,
        fontWeight: "700",
    },
});
