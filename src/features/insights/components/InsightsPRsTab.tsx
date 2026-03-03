// src/features/insights/components/InsightsPRsTab.tsx
import { format, subYears } from "date-fns";
import React from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { DatePickerField } from "@/src/features/components/DatePickerField";
import { usePRs } from "@/src/hooks/summary/usePRs";
import type { PrRecord, PrsResponse } from "@/src/services/workout/insights.service";
import { useTheme } from "@/src/theme/ThemeProvider";

function todayIsoLocal(): string {
    return format(new Date(), "yyyy-MM-dd");
}

function oneYearAgoIsoLocal(): string {
    return format(subYears(new Date(), 1), "yyyy-MM-dd");
}

function metricLabel(metric: PrRecord["metric"]): string {
    switch (metric) {
        case "activeKcal":
            return "Kcal activas";
        case "durationSeconds":
            return "Duración (seg)";
        case "avgHr":
            return "HR prom.";
        case "maxHr":
            return "HR máx.";
        case "distanceKm":
            return "Distancia (km)";
        case "steps":
            return "Pasos";
        case "paceSecPerKm":
            return "Ritmo (seg/km)";
        default:
            return metric;
    }
}

function modeLabel(mode: PrRecord["mode"]): string {
    return mode === "max" ? "máx." : "mín.";
}

type Props = {
    defaultFrom?: string;
    defaultTo?: string;
};

const MIN_TABLE_WIDTH = 560;

export function InsightsPRsTab({ defaultFrom, defaultTo }: Props) {
    const { colors } = useTheme();

    const [from, setFrom] = React.useState<string>(() => defaultFrom ?? oneYearAgoIsoLocal());
    const [to, setTo] = React.useState<string>(() => defaultTo ?? todayIsoLocal());

    const enabled = Boolean(from) && Boolean(to);

    const { data, isLoading, isFetching, isError, refetch } = usePRs({ from, to }, enabled);

    return (
        <View style={{ gap: 12 }}>
            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={{ fontWeight: "800", color: colors.text }}>PRs</Text>
                <Text style={{ color: colors.mutedText, fontWeight: "700", fontSize: 13 }}>
                    Mejores marcas personales en un rango de fechas.
                </Text>

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

            {isLoading ? (
                <View style={[styles.center, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <ActivityIndicator />
                    <Text style={{ color: colors.mutedText, fontWeight: "800" }}>Cargando PRs...</Text>
                </View>
            ) : isError ? (
                <View style={[styles.center, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <Text style={{ color: colors.mutedText, fontWeight: "800" }}>No se pudieron cargar los PRs.</Text>
                </View>
            ) : data ? (
                <PRsTable data={data} />
            ) : null}
        </View>
    );

    function PRsTable({ data }: { data: PrsResponse }) {
        const rows = data.prs ?? [];

        if (!rows.length) {
            return (
                <View style={[styles.center, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <Text style={{ color: colors.mutedText, fontWeight: "800" }}>Sin PRs en este rango.</Text>
                </View>
            );
        }

        return (
            <View style={[styles.tableCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                {/* Horizontal scroll wrapper */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator
                    contentContainerStyle={{ minWidth: MIN_TABLE_WIDTH }}
                >
                    <View style={{ minWidth: MIN_TABLE_WIDTH, flex: 1 }}>
                        <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.th, { color: colors.mutedText, flex: 1.3 }]}>Sesión</Text>
                            <Text style={[styles.th, { color: colors.mutedText, flex: 1.6 }]}>Métrica</Text>
                            <Text style={[styles.th, { color: colors.mutedText, width: 90, textAlign: "right" }]}>Valor</Text>
                            <Text style={[styles.th, { color: colors.mutedText, width: 110, textAlign: "right" }]}>Fecha</Text>
                        </View>

                        {/* Vertical scroll for rows */}
                        <ScrollView style={{ maxHeight: 320 }} nestedScrollEnabled>
                            {rows.map((r) => (
                                <View
                                    key={`${r.sessionId}-${r.metric}-${r.mode}-${r.date}`}
                                    style={[styles.tr, { borderBottomColor: colors.border }]}
                                >
                                    <Text style={[styles.td, { color: colors.text, flex: 1.3 }]} numberOfLines={1}>
                                        {r.sessionType || "—"}
                                    </Text>
                                    <Text style={[styles.td, { color: colors.text, flex: 1.6 }]} numberOfLines={1}>
                                        {metricLabel(r.metric)} ({modeLabel(r.mode)})
                                    </Text>
                                    <Text style={[styles.td, { color: colors.text, width: 90, textAlign: "right" }]} numberOfLines={1}>
                                        {String(r.value)}
                                    </Text>
                                    <Text style={[styles.td, { color: colors.text, width: 110, textAlign: "right" }]} numberOfLines={1}>
                                        {r.date}
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