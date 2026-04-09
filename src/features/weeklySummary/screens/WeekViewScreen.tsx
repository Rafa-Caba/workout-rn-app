// src/features/weeklySummary/screens/WeekViewScreen.tsx
import { addWeeks, format } from "date-fns";
import { useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { DatePickerField } from "@/src/features/components/DatePickerField";
import { useWeekSummary } from "@/src/hooks/summary/useWeekSummary";
import { useTheme } from "@/src/theme/ThemeProvider";

import { toWeekKey, weekKeyToEndDate, weekKeyToStartDate } from "@/src/utils/weekKey";
import { extractWeekKpis } from "@/src/utils/weeksExplorer";

import { WeekBySessionTypeTable } from "../components/WeekBySessionTypeTable";
import { WeekKpiCard } from "../components/WeekKpiCard";

type Props = {
    weekKey: string;
};

function toISODate(date: Date): string {
    return format(date, "yyyy-MM-dd");
}

function safeWeekKey(input: string): string {
    const v = String(input ?? "").trim();
    if (v) return v;
    return toWeekKey(new Date());
}

export function WeekViewScreen({ weekKey }: Props) {
    const router = useRouter();
    const { colors } = useTheme();

    const [wk, setWk] = React.useState<string>(() => safeWeekKey(weekKey));
    React.useEffect(() => setWk(safeWeekKey(weekKey)), [weekKey]);

    const start = React.useMemo(() => weekKeyToStartDate(wk), [wk]);
    const end = React.useMemo(() => weekKeyToEndDate(wk), [wk]);

    const [pickedDayIso, setPickedDayIso] = React.useState<string>(() => toISODate(start));
    React.useEffect(() => setPickedDayIso(toISODate(start)), [wk, start]);

    const { data, isLoading, isFetching, isError } = useWeekSummary(wk);

    const rangeLabel = React.useMemo(() => {
        // Web style: "Feb 23, 2026 → Mar 1, 2026"
        const a = format(start, "MMM dd, yyyy");
        const b = format(end, "MMM dd, yyyy");
        return `${a} \u2192 ${b}`;
    }, [start, end]);

    function goPrevWeek() {
        const prev = addWeeks(start, -1);
        const nextWk = toWeekKey(prev);
        setWk(nextWk);
        router.setParams({ weekKey: nextWk } as any);
    }

    function goNextWeek() {
        const next = addWeeks(start, 1);
        const nextWk = toWeekKey(next);
        setWk(nextWk);
        router.setParams({ weekKey: nextWk } as any);
    }

    function onPickDay(nextIso: string) {
        setPickedDayIso(nextIso);

        const dt = new Date(`${nextIso}T00:00:00`);
        const nextWk = toWeekKey(dt);
        setWk(nextWk);
        router.setParams({ weekKey: nextWk } as any);
    }

    const extracted = React.useMemo(() => {
        if (!data) return null;
        return extractWeekKpis(data);
    }, [data]);

    const kpis = extracted?.kpis ?? null;
    const byType = extracted?.bySessionType ?? [];

    const hrLabel =
        kpis && (kpis.avgHr !== "—" || kpis.maxHr !== "—")
            ? `${kpis.avgHr} / ${kpis.maxHr}`
            : "—";

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}
        >
            <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>
                    Resumen semanal
                </Text>
                <Text style={{ color: colors.mutedText, fontWeight: "600" }}>
                    Carga un resumen por semana.
                </Text>
            </View>

            {/* Week selector card */}
            <View style={[styles.selectorCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <DatePickerField
                    label="Elige una fecha de la semana"
                    value={pickedDayIso}
                    onChange={onPickDay}
                    displayFormat="MM/dd/yyyy"
                />
                <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
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
                        })}
                    >
                        <Text style={{ fontWeight: "800", color: colors.text }}>← Semana anterior</Text>
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
                        })}
                    >
                        <Text style={{ fontWeight: "800", color: colors.text }}>Semana siguiente →</Text>
                    </Pressable>
                </View>

                <View style={[styles.rangeRow, { borderColor: colors.border, backgroundColor: colors.background, alignItems: 'flex-start' }]}>
                    <Text style={{ color: colors.mutedText, fontWeight: "800" }}>Rango de semana:</Text>
                    <Text style={{ color: colors.text, fontWeight: "800" }}>{rangeLabel}</Text>
                </View>

                <View style={styles.metaRight}>
                    <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                        weekKey seleccionado: <Text style={{ color: colors.text, fontWeight: "800" }}>{wk}</Text>
                    </Text>

                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        {isFetching ? <Text style={{ color: colors.mutedText, fontWeight: "800" }}>sync</Text> : null}
                    </View>
                </View>
            </View>

            {/* Content */}
            {isLoading ? (
                <View style={[styles.center, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <ActivityIndicator />
                    <Text style={{ color: colors.mutedText, fontWeight: "700" }}>Cargando resumen...</Text>
                </View>
            ) : isError ? (
                <View style={[styles.center, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <Text style={{ color: colors.mutedText, fontWeight: "800" }}>
                        No se pudo cargar el resumen.
                    </Text>
                </View>
            ) : !data || !kpis ? (
                <View style={[styles.center, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <Text style={{ color: colors.mutedText, fontWeight: "800" }}>Sin datos.</Text>
                </View>
            ) : (
                <>
                    {/* KPI grid */}
                    <View style={styles.kpiGrid}>
                        <WeekKpiCard title="📅 Días" value={kpis.daysCount} />
                        <WeekKpiCard title="🏋️ Sesiones" value={kpis.sessionsCount} />

                        <WeekKpiCard title="⏱️ Duración (min)" value={kpis.durationMinutes} />
                        <WeekKpiCard title="🔥 Kcal activas" value={kpis.activeKcal} />

                        <WeekKpiCard title="🖼️ Media" value={kpis.mediaCount} />
                        <WeekKpiCard title="🛌 Sueño (días)" value={kpis.sleepDays} />

                        <WeekKpiCard title="🛌 Sueño avg (min)" value={kpis.sleepAvgTotal} />
                        <WeekKpiCard title="🏆 Sueño score" value={kpis.sleepAvgScore} />

                        <WeekKpiCard title="🌙 REM prom (min)" value={kpis.sleepAvgRem} />
                        <WeekKpiCard title="🧠 Deep prom (min)" value={kpis.sleepAvgDeep} />

                        <WeekKpiCard title="❤️ HR avg / max" value={hrLabel} />
                    </View>

                    <WeekBySessionTypeTable rows={byType} />
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    selectorCard: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 12,
        gap: 10,
    },
    rangeRow: {
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },
    metaRight: {
        alignItems: "flex-end",
        gap: 6,
    },
    center: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },
    kpiGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
});