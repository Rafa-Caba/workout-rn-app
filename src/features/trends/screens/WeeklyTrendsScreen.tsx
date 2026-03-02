// src/features/trends/screens/WeeklyTrendsScreen.tsx
import React from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useWeeklyTrends } from "@/src/hooks/summary/useWeeklyTrends";
import { useTheme } from "@/src/theme/ThemeProvider";
import { defaultTrendsRange, sanitizeWeekKeyInput } from "@/src/utils/trendsDefaults";

import type { WeekTrendPoint } from "@/src/types/workoutSummary.types";
import type { ChartMetricKey, ChartRow } from "../components/WeeklyTrendsChart";

import { secondsToMinutesOrDash } from "@/src/utils/time";
import { TrendKpiCard } from "../components/TrendKpiCard";
import { WeekKeyInputField } from "../components/WeekKeyInputField";
import { WeeklyTrendsChart } from "../components/WeeklyTrendsChart";

function toRow(p: WeekTrendPoint): ChartRow {
    return {
        weekKey: p.weekKey,
        sessionsCount: p.training.sessionsCount ?? 0,
        durationSeconds: p.training.durationSeconds ?? 0,
        activeKcal: p.training.activeKcal ?? null,
        mediaCount: p.mediaCount ?? 0,
        sleepDays: p.sleep.daysWithSleep ?? 0,
    };
}

function pickDefaultSelectedWeek(points: WeekTrendPoint[]): string | null {
    if (!points.length) return null;
    // Prefer last week (usually latest)
    return points[points.length - 1].weekKey;
}

export function WeeklyTrendsScreen() {
    const { colors } = useTheme();

    const defaults = React.useMemo(() => defaultTrendsRange(new Date()), []);
    const [fromWeek, setFromWeek] = React.useState<string>(defaults.fromWeek);
    const [toWeek, setToWeek] = React.useState<string>(defaults.toWeek);

    const safeFrom = sanitizeWeekKeyInput(fromWeek);
    const safeTo = sanitizeWeekKeyInput(toWeek);

    const { data, isLoading, isFetching, isError } = useWeeklyTrends(safeFrom as any, safeTo as any);

    const points = data?.points ?? [];
    const rows = React.useMemo(() => points.map(toRow), [points]);

    const [metric, setMetric] = React.useState<ChartMetricKey>("duration");
    const [selectedWeekKey, setSelectedWeekKey] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!points.length) {
            setSelectedWeekKey(null);
            return;
        }
        setSelectedWeekKey((prev) => prev ?? pickDefaultSelectedWeek(points));
    }, [points]);

    const selectedRow = React.useMemo(() => {
        if (!selectedWeekKey) return null;
        return rows.find((r) => r.weekKey === selectedWeekKey) ?? null;
    }, [rows, selectedWeekKey]);

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}
        >
            <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 22, fontWeight: "900", color: colors.text }}>Tendencias (semanas)</Text>
                <Text style={{ color: colors.mutedText, fontWeight: "600" }}>
                    Visualiza métricas agregadas por semana.
                </Text>
            </View>

            {/* Range inputs (week keys) */}
            <View style={[styles.selectorCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <View style={{ flexDirection: "row", gap: 10 }}>
                    <WeekKeyInputField label="Desde semana" value={fromWeek} onChange={setFromWeek} />
                    <WeekKeyInputField label="Hasta semana" value={toWeek} onChange={setToWeek} />
                </View>

                <View style={styles.loadedRow}>
                    <Text style={{ color: colors.mutedText, fontWeight: "800" }}>
                        Cargado:{" "}
                        <Text style={{ color: colors.text, fontWeight: "900" }}>
                            {safeFrom} → {safeTo}
                        </Text>
                    </Text>

                    {isFetching ? <Text style={{ color: colors.mutedText, fontWeight: "900" }}>sync</Text> : null}
                </View>
            </View>

            {/* KPI cards (selected week) */}
            <View style={styles.kpiGrid}>
                <TrendKpiCard title="📅 Semana" value={selectedRow?.weekKey ?? "—"} />
                <TrendKpiCard title="🏋️ Sesiones" value={selectedRow?.sessionsCount ?? "—"} />
                <TrendKpiCard title="⏱️ Duración (s)" value={secondsToMinutesOrDash(selectedRow?.durationSeconds) ?? "—"} />
                <TrendKpiCard title="🖼️ Media" value={selectedRow?.mediaCount ?? "—"} />
            </View>

            {/* Metric selector */}
            <View style={[styles.segment, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <MetricButton title="Sesiones" active={metric === "sessions"} onPress={() => setMetric("sessions")} />
                <MetricButton title="Duración" active={metric === "duration"} onPress={() => setMetric("duration")} />
                <MetricButton title="Kcal" active={metric === "activeKcal"} onPress={() => setMetric("activeKcal")} />
                <MetricButton title="Media" active={metric === "media"} onPress={() => setMetric("media")} />
                <MetricButton title="Sueño" active={metric === "sleepDays"} onPress={() => setMetric("sleepDays")} />
            </View>

            {/* Chart */}
            {isLoading ? (
                <View style={[styles.center, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <ActivityIndicator />
                    <Text style={{ color: colors.mutedText, fontWeight: "700" }}>Cargando tendencias...</Text>
                </View>
            ) : isError ? (
                <View style={[styles.center, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <Text style={{ color: colors.mutedText, fontWeight: "800" }}>No se pudo cargar tendencias.</Text>
                </View>
            ) : (
                <WeeklyTrendsChart
                    rows={rows}
                    metric={metric}
                    selectedWeekKey={selectedWeekKey}
                    onSelectWeek={setSelectedWeekKey}
                />
            )}
        </ScrollView>
    );
}

function MetricButton({ title, active, onPress }: { title: string; active: boolean; onPress: () => void }) {
    const { colors } = useTheme();

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.segmentBtn,
                {
                    backgroundColor: active ? colors.primary : "transparent",
                    borderColor: active ? colors.primary : "transparent",
                    opacity: pressed ? 0.92 : 1,
                },
            ]}
        >
            <Text style={[styles.segmentText, { color: active ? colors.primaryText : colors.text }]}>{title}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    selectorCard: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 10 },
    loadedRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

    kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

    segment: {
        flexDirection: "row",
        borderWidth: 1,
        borderRadius: 14,
        padding: 4,
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
    },
    segmentBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        minWidth: 92,
        alignItems: "center",
        justifyContent: "center",
    },
    segmentText: { fontSize: 12, fontWeight: "900" },

    center: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },
});