// src/features/insights/components/InsightsRecoveryTab.tsx
import { format, subDays } from "date-fns";
import React from "react";
import { ActivityIndicator, DimensionValue, ScrollView, StyleSheet, Text, View } from "react-native";

import { DatePickerField } from "@/src/features/components/DatePickerField";
import { useRecovery } from "@/src/hooks/summary/useRecovery";
import type { RecoveryPoint, RecoveryResponse } from "@/src/services/workout/insights.service";
import { useTheme } from "@/src/theme/ThemeProvider";

function todayIsoLocal(): string {
    return format(new Date(), "yyyy-MM-dd");
}

function daysAgoIsoLocal(days: number): string {
    return format(subDays(new Date(), days), "yyyy-MM-dd");
}

function levelLabel(level: RecoveryPoint["level"]): string {
    switch (level) {
        case "green":
            return "Verde";
        case "yellow":
            return "Amarillo";
        case "red":
            return "Rojo";
        case "unknown":
        default:
            return "—";
    }
}

type Props = {
    defaultFrom?: string;
    defaultTo?: string;
};

const MIN_TABLE_WIDTH = 560;

export function InsightsRecoveryTab({ defaultFrom, defaultTo }: Props) {
    const { colors } = useTheme();

    const [from, setFrom] = React.useState<string>(() => defaultFrom ?? daysAgoIsoLocal(30));
    const [to, setTo] = React.useState<string>(() => defaultTo ?? todayIsoLocal());

    const enabled = Boolean(from) && Boolean(to);

    const { data, isLoading, isFetching, isError, refetch } = useRecovery({ from, to }, enabled);

    const summary = React.useMemo(() => {
        const points = data?.points ?? [];
        if (!points.length) return null;

        const sumScore = points.reduce((acc, p) => acc + (p.recoveryScore ?? 0), 0);
        const scoreCount = points.filter((p) => p.recoveryScore != null).length;

        const sumSleep = points.reduce((acc, p) => acc + (p.totalSleepMinutes ?? 0), 0);
        const sleepCount = points.filter((p) => p.totalSleepMinutes != null).length;

        const sumLoad = points.reduce((acc, p) => acc + (p.trainingLoad ?? 0), 0);

        return {
            avgScore: scoreCount ? sumScore / scoreCount : null,
            avgSleepMin: sleepCount ? sumSleep / sleepCount : null,
            avgLoad: points.length ? sumLoad / points.length : null,
        };
    }, [data]);

    return (
        <View style={{ gap: 12 }}>
            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={{ fontWeight: "800", color: colors.text }}>Recuperación</Text>
                <Text style={{ color: colors.mutedText, fontWeight: "700" }}>Resumen de recuperación para un rango de fechas.</Text>

                <View style={{ height: 10 }} />

                <View style={styles.rangeRow}>
                    <View style={{ flex: 1 }}>
                        <DatePickerField label="Desde" value={from} onChange={setFrom} displayFormat="MM/dd/yyyy" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <DatePickerField label="Hasta" value={to} onChange={setTo} displayFormat="MM/dd/yyyy" />
                    </View>
                </View>

                <View style={{ height: 10 }} />

                {/* <View style={styles.actionsRow}>
                    <Pressable
                        onPress={() => refetch()}
                        style={({ pressed }) => ({
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                            opacity: pressed ? 0.92 : 1,
                        })}
                    >
                        <Text style={{ fontWeight: "800", color: colors.text }}>Recargar</Text>
                    </Pressable>

                    {isFetching ? <Text style={{ color: colors.mutedText, fontWeight: "800" }}>sync</Text> : null}
                </View> */}
            </View>

            {summary ? (
                <View style={styles.kpisRow}>
                    <Kpi title="Score (aprox.)" value={summary.avgScore != null ? String(round1(summary.avgScore)) : "—"} width="29%" />
                    <Kpi title="Sueño (min, aprox.)" value={summary.avgSleepMin != null ? String(Math.round(summary.avgSleepMin)) : "—"} width="35%" />
                    <Kpi title="Carga (aprox.)" value={summary.avgLoad != null ? String(round2(summary.avgLoad)) : "—"} width="30%" />
                </View>
            ) : null}

            {isLoading ? (
                <View style={[styles.center, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <ActivityIndicator />
                    <Text style={{ color: colors.mutedText, fontWeight: "800" }}>Cargando recuperación...</Text>
                </View>
            ) : isError ? (
                <View style={[styles.center, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <Text style={{ color: colors.mutedText, fontWeight: "800" }}>No se pudo cargar la recuperación.</Text>
                </View>
            ) : data ? (
                <RecoveryTable data={data} />
            ) : null}
        </View>
    );

    function Kpi({ title, value, width }: { title: string; value: string | number; width: DimensionValue | undefined }) {
        return (
            <View style={[styles.kpiCard, { borderColor: colors.border, backgroundColor: colors.surface, minWidth: width }]}>
                <Text style={{ color: colors.mutedText, fontWeight: "800", fontSize: 10 }}>{title}</Text>
                <Text style={{ color: colors.text, fontWeight: "800", fontSize: 18 }}>{String(value)}</Text>
            </View>
        );
    }

    function RecoveryTable({ data }: { data: RecoveryResponse }) {
        const points = data.points ?? [];

        if (!points.length) {
            return (
                <View style={[styles.center, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <Text style={{ color: colors.mutedText, fontWeight: "800" }}>Sin datos de recuperación en este rango.</Text>
                </View>
            );
        }

        return (
            <View style={[styles.tableCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                {/* Horizontal scroll wrapper */}
                <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ minWidth: MIN_TABLE_WIDTH }}>
                    <View style={{ minWidth: MIN_TABLE_WIDTH, flex: 1 }}>
                        <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.th, { color: colors.mutedText, width: 110 }]}>Fecha</Text>
                            <Text style={[styles.th, { color: colors.mutedText, width: 86, textAlign: "right" }]}>Score</Text>
                            <Text style={[styles.th, { color: colors.mutedText, width: 96, textAlign: "right" }]}>Sueño</Text>
                            <Text style={[styles.th, { color: colors.mutedText, width: 96, textAlign: "right" }]}>Carga</Text>
                            <Text style={[styles.th, { color: colors.mutedText, width: 110, textAlign: "right" }]}>Nivel</Text>
                        </View>

                        {/* Vertical scroll for rows */}
                        <ScrollView style={{ maxHeight: 360 }} nestedScrollEnabled>
                            {points.map((p) => (
                                <View key={`${p.date}-${p.weekKey}`} style={[styles.tr, { borderBottomColor: colors.border }]}>
                                    <Text style={[styles.td, { color: colors.text, width: 110 }]} numberOfLines={1}>
                                        {p.date}
                                    </Text>
                                    <Text style={[styles.td, { color: colors.text, width: 86, textAlign: "right" }]} numberOfLines={1}>
                                        {p.recoveryScore != null ? String(round1(p.recoveryScore)) : "—"}
                                    </Text>
                                    <Text style={[styles.td, { color: colors.text, width: 96, textAlign: "right" }]} numberOfLines={1}>
                                        {p.totalSleepMinutes != null ? String(Math.round(p.totalSleepMinutes)) : "—"}
                                    </Text>
                                    <Text style={[styles.td, { color: colors.text, width: 96, textAlign: "right" }]} numberOfLines={1}>
                                        {String(round2(p.trainingLoad))}
                                    </Text>
                                    <Text style={[styles.td, { color: colors.text, width: 110, textAlign: "right" }]} numberOfLines={1}>
                                        {levelLabel(p.level)}
                                    </Text>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </ScrollView>
            </View>
        );
    }
}

function round1(n: number): number {
    return Math.round(n * 10) / 10;
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

const styles = StyleSheet.create({
    card: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 4 },

    rangeRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },

    actionsRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
    },

    kpisRow: { flexDirection: "row", gap: 5, flexWrap: "wrap" },
    kpiCard: {
        flex: 1,
        minWidth: "30%",
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 12,
        gap: 6,
    },

    center: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        gap: 8,
        alignItems: "center",
        justifyContent: "center",
    },

    tableCard: { borderWidth: 1, borderRadius: 16, overflow: "hidden" },
    tableHeader: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
    th: { fontWeight: "800", fontSize: 12 },

    tr: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
    td: { fontWeight: "800", fontSize: 13 },
});