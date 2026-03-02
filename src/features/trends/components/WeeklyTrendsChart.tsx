// src/features/trends/components/WeeklyTrendsChart.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

export type ChartMetricKey = "sessions" | "duration" | "activeKcal" | "media" | "sleepDays";

export type ChartRow = {
    weekKey: string;
    sessionsCount: number;
    durationSeconds: number;
    activeKcal: number | null;
    mediaCount: number;
    sleepDays: number;
};

type Props = {
    rows: ChartRow[];
    metric: ChartMetricKey;
    selectedWeekKey: string | null;
    onSelectWeek: (weekKey: string) => void;
};

function metricLabel(metric: ChartMetricKey): string {
    switch (metric) {
        case "sessions":
            return "Sesiones";
        case "duration":
            return "Duración (s)";
        case "activeKcal":
            return "Kcal activas";
        case "media":
            return "Media";
        case "sleepDays":
            return "Sueño (días)";
        default:
            return "Métrica";
    }
}

function metricValue(row: ChartRow, metric: ChartMetricKey): number {
    switch (metric) {
        case "sessions":
            return row.sessionsCount;
        case "duration":
            return row.durationSeconds;
        case "activeKcal":
            return row.activeKcal ?? 0;
        case "media":
            return row.mediaCount;
        case "sleepDays":
            return row.sleepDays;
        default:
            return 0;
    }
}

export function WeeklyTrendsChart({ rows, metric, selectedWeekKey, onSelectWeek }: Props) {
    const { colors } = useTheme();

    const max = React.useMemo(() => {
        let m = 0;
        for (const r of rows) {
            const v = metricValue(r, metric);
            if (v > m) m = v;
        }
        return m;
    }, [rows, metric]);

    return (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>{`📈 ${metricLabel(metric)}`}</Text>

            <View style={[styles.chartArea, { borderColor: colors.border, backgroundColor: colors.background }]}>
                {rows.length === 0 ? (
                    <Text style={[styles.empty, { color: colors.mutedText }]}>Sin datos.</Text>
                ) : (
                    <View style={styles.barsRow}>
                        {rows.map((r) => {
                            const v = metricValue(r, metric);
                            const pct = max > 0 ? Math.max(0, Math.min(1, v / max)) : 0;
                            const isSelected = selectedWeekKey === r.weekKey;

                            return (
                                <Pressable
                                    key={r.weekKey}
                                    onPress={() => onSelectWeek(r.weekKey)}
                                    style={({ pressed }) => [
                                        styles.barWrap,
                                        { opacity: pressed ? 0.9 : 1 },
                                    ]}
                                >
                                    <View
                                        style={[
                                            styles.bar,
                                            {
                                                borderColor: isSelected ? colors.primary : colors.border,
                                                backgroundColor: isSelected ? colors.primary : colors.surface,
                                                height: 16 + pct * 120,
                                            },
                                        ]}
                                    />
                                    <Text style={[styles.xLabel, { color: isSelected ? colors.text : colors.mutedText }]} numberOfLines={1}>
                                        {r.weekKey}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                )}
            </View>

            <Text style={[styles.hint, { color: colors.mutedText }]}>
                Tip: toca una barra para seleccionar la semana.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
    title: { fontSize: 14, fontWeight: "900" },

    chartArea: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 12,
        minHeight: 220,
        justifyContent: "center",
    },
    empty: { fontSize: 13, fontWeight: "700" },

    barsRow: { flexDirection: "row", gap: 10, alignItems: "flex-end" },
    barWrap: { alignItems: "center", justifyContent: "flex-end", width: 70 },
    bar: {
        width: 22,
        borderWidth: 2,
        borderRadius: 999,
    },
    xLabel: { marginTop: 8, fontSize: 11, fontWeight: "900" },

    hint: { fontSize: 12, fontWeight: "700" },
});