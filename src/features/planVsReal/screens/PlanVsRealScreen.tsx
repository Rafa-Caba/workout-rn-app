// src/features/planVsReal/screens/PlanVsRealScreen.tsx
import { addDays, addWeeks, format } from "date-fns";
import React from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { DatePickerField } from "@/src/features/components/DatePickerField";
import { usePlanVsActual } from "@/src/hooks/summary/usePlanVsActual";
import { useTheme } from "@/src/theme/ThemeProvider";
import { DAY_KEYS } from "@/src/utils/routines/plan";
import { toWeekKey, weekKeyToStartDate } from "@/src/utils/weekKey";

import { PlanVsRealTable, type PlanVsActualDayUi } from "../components/PlanVsRealTable";

function todayIsoLocal(): string {
    return format(new Date(), "yyyy-MM-dd");
}

function normalizeStatusForKpi(status: string): "done" | "rest" | "extra" | "other" {
    const s = (status || "").toLowerCase().trim();
    if (s === "done") return "done";
    if (s === "rest") return "rest";
    if (s === "extra") return "extra";
    return "other";
}

function computeKpis(days: PlanVsActualDayUi[]) {
    const totalDays = days.length || 7;

    const planned = days.filter((d) => {
        const p = d.planned;
        const hasPlanned =
            Boolean((p?.sessionType ?? "").trim()) ||
            Boolean((p?.focus ?? "").trim()) ||
            Boolean((p?.tags?.length ?? 0) > 0);
        return hasPlanned;
    }).length;

    const actualSessions = days.reduce((acc, d) => acc + (d.actualSessionsCount > 0 ? d.actualSessionsCount : 0), 0);
    const gymCheckDays = days.filter((d) => d.gymCheck?.hasAnyCheck).length;

    const done = days.filter((d) => normalizeStatusForKpi(d.status) === "done").length;
    const rest = days.filter((d) => normalizeStatusForKpi(d.status) === "rest").length;
    const extra = days.filter((d) => normalizeStatusForKpi(d.status) === "extra").length;

    return { totalDays, planned, actualSessions, gymCheckDays, done, rest, extra };
}

export function PlanVsRealScreen() {
    const { colors } = useTheme();

    const [weekDateIso, setWeekDateIso] = React.useState<string>(() => todayIsoLocal());
    const [weekKey, setWeekKey] = React.useState<string>(() => toWeekKey(new Date()));

    React.useEffect(() => {
        setWeekKey(toWeekKey(new Date(weekDateIso)));
    }, [weekDateIso]);

    function goPrevWeek() {
        const start = weekKeyToStartDate(weekKey);
        const prev = addWeeks(start, -1);
        setWeekDateIso(format(prev, "yyyy-MM-dd"));
        setWeekKey(toWeekKey(prev));
    }

    function goNextWeek() {
        const start = weekKeyToStartDate(weekKey);
        const next = addWeeks(start, 1);
        setWeekDateIso(format(next, "yyyy-MM-dd"));
        setWeekKey(toWeekKey(next));
    }

    const { data, isLoading, isFetching, isError, refetch } = usePlanVsActual(weekKey, true);

    const days: PlanVsActualDayUi[] = React.useMemo(() => {
        const list = data?.days ?? [];

        // Ensure stable order Mon..Sun even if backend returns weird order
        const map = new Map<string, typeof list[number]>();
        for (const d of list) map.set(d.dayKey, d);

        return DAY_KEYS.map((dk) => {
            const found = map.get(dk);
            if (!found) {
                // fallback placeholder
                const start = weekKeyToStartDate(weekKey);
                const idx = DAY_KEYS.indexOf(dk);
                const iso = format(addDays(start, idx), "yyyy-MM-dd");

                return {
                    dayKey: dk,
                    date: iso,
                    planned: null,
                    gymCheck: null,
                    actualSessionsCount: 0,
                    status: "unknown",
                };
            }

            const actualSessionsCount = Array.isArray(found.actual?.sessions) ? found.actual.sessions.length : 0;

            return {
                dayKey: found.dayKey,
                date: found.date,
                planned: found.planned ?? null,
                gymCheck: found.gymCheck ?? null,
                actualSessionsCount,
                status: found.status,
            };
        });
    }, [data?.days, weekKey]);

    const rangeLabel = React.useMemo(() => {
        // Prefer backend range if present (more accurate)
        const from = data?.range?.from ?? "";
        const to = data?.range?.to ?? "";

        if (from && to) return `${from} → ${to}`;

        // fallback based on computed weekKey
        const start = weekKeyToStartDate(weekKey);
        const end = addDays(start, 6);
        return `${format(start, "MMM d, yyyy")} → ${format(end, "MMM d, yyyy")}`;
    }, [data?.range?.from, data?.range?.to, weekKey]);

    const kpis = React.useMemo(() => computeKpis(days), [days]);

    return (
        <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.container}>
            <View style={styles.headerRow}>
                <View style={{ gap: 4, flex: 1 }}>
                    <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>Plan vs Real</Text>
                    <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                        Comparación semanal de plan, gym check y sesiones reales.
                    </Text>
                </View>

                {/* <Pressable
                    onPress={() => refetch()}
                    style={({ pressed }) => ({
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                        opacity: pressed ? 0.92 : 1,
                    })}
                >
                    <Text style={{ fontWeight: "800", color: colors.text }}>Recargar</Text>
                </Pressable> */}
            </View>

            {/* Controls */}
            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={{ fontWeight: "800", color: colors.text }}>Semana</Text>

                <View style={{ height: 10 }} />

                <DatePickerField
                    label="Elige fecha: "
                    value={weekDateIso}
                    onChange={setWeekDateIso}
                    displayFormat="MM/dd/yyyy"
                />

                <View style={{ height: 10 }} />

                <View style={styles.weekNavRow}>
                    <Pressable
                        onPress={goPrevWeek}
                        style={({ pressed }) => ({
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                            opacity: pressed ? 0.92 : 1,
                            flex: 1,
                            alignItems: "center",
                        })}
                    >
                        <Text style={{ fontWeight: "800", color: colors.text, fontSize: 13 }}>← Semana anterior</Text>
                    </Pressable>

                    <Pressable
                        onPress={goNextWeek}
                        style={({ pressed }) => ({
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                            opacity: pressed ? 0.92 : 1,
                            flex: 1,
                            alignItems: "center",
                        })}
                    >
                        <Text style={{ fontWeight: "800", color: colors.text, fontSize: 13 }}>Semana siguiente →</Text>
                    </Pressable>
                </View>

                <View style={{ height: 10 }} />

                <View style={[styles.infoRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                    <Text style={{ color: colors.mutedText, fontWeight: "800" }}>Rango:</Text>
                    <Text style={{ color: colors.text, fontWeight: "800" }}>{rangeLabel}</Text>
                </View>

                <View style={{ height: 10 }} />

                <View style={styles.actionsRow}>
                    <Text style={{ color: colors.mutedText, fontWeight: "800" }}>weekKey:</Text>
                    <Text style={{ color: colors.text, fontWeight: "800" }}>{weekKey}</Text>

                    {isFetching ? <Text style={{ color: colors.mutedText, fontWeight: "800" }}>sync</Text> : null}
                </View>
            </View>

            {/* KPIs */}
            <View style={styles.kpisRow}>
                <Kpi title="Días" value={kpis.totalDays} />
                <Kpi title="Planificados" value={kpis.planned} />
                <Kpi title="Gym Check" value={kpis.gymCheckDays} />
                <Kpi title="Hecho" value={kpis.done} />
                <Kpi title="Descanso" value={kpis.rest} />
                <Kpi title="Extra" value={kpis.extra} />
                <Kpi title="Sesiones reales" value={kpis.actualSessions} />
            </View>

            {/* Content */}
            {isLoading ? (
                <View style={[styles.center, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <ActivityIndicator />
                    <Text style={{ color: colors.mutedText, fontWeight: "800" }}>Cargando Plan vs Real...</Text>
                </View>
            ) : isError ? (
                <View style={[styles.center, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <Text style={{ color: colors.mutedText, fontWeight: "800" }}>No se pudo cargar Plan vs Real.</Text>
                </View>
            ) : days.length ? (
                <PlanVsRealTable days={days} />
            ) : (
                <View style={[styles.center, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <Text style={{ color: colors.mutedText, fontWeight: "800" }}>Sin datos.</Text>
                </View>
            )}
        </ScrollView>
    );

    function Kpi({ title, value }: { title: string; value: string | number }) {
        return (
            <View style={[styles.kpiCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={{ color: colors.mutedText, fontWeight: "800", fontSize: 12 }}>{title}</Text>
                <Text style={{ color: colors.text, fontWeight: "800", fontSize: 18 }}>{String(value)}</Text>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: { padding: 16, gap: 14, paddingBottom: 32 },

    headerRow: {
        flexDirection: "row",
        gap: 12,
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
    },

    card: { borderWidth: 1, borderRadius: 16, padding: 12 },

    weekNavRow: { flexDirection: "row", gap: 10 },

    infoRow: {
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },

    actionsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        justifyContent: "space-between",
    },

    kpisRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
    kpiCard: {
        flex: 1,
        minWidth: "30%",
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 14,
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
});