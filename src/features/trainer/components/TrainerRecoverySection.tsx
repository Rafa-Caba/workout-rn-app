// src/features/trainer/components/TrainerRecoverySection.tsx
import { addDays, format } from "date-fns";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useTrainerRecovery } from "@/src/hooks/trainer/useTrainerRecovery";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { TraineeRecoveryDay } from "@/src/types/trainer.types";
import type { ISODate } from "@/src/types/workoutDay.types";
import { weekKeyToStartDate } from "@/src/utils/weekKey";

function mmToHhMm(min: number | null | undefined): string {
    if (min == null) return "—";
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}h ${String(m).padStart(2, "0")}m`;
}

function pct(n: number | null | undefined): string {
    if (n == null) return "—";
    return `${Math.round(n)}%`;
}

function avg(nums: Array<number | null | undefined>): number | null {
    const v = nums.filter((x): x is number => typeof x === "number" && Number.isFinite(x));
    if (v.length === 0) return null;
    return v.reduce((a, b) => a + b, 0) / v.length;
}

function safeIsoDate(d: Date): ISODate {
    return format(d, "yyyy-MM-dd") as ISODate;
}

type SleepAgg = {
    daysWithSleep: number;
    avgScore: number | null;
    avgAsleepMin: number | null;
    avgInBedMin: number | null;
    avgEfficiencyPct: number | null;

    avgRemMin: number | null;
    avgCoreMin: number | null;
    avgDeepMin: number | null;
    avgAwakeMin: number | null;
};

function buildSleepAgg(days: TraineeRecoveryDay[]): SleepAgg {
    const withSleep = days.filter((d) => d.sleep != null);
    const daysWithSleep = withSleep.length;

    const avgScore = avg(withSleep.map((d) => d.sleep?.score ?? null));
    const avgAsleepMin = avg(withSleep.map((d) => d.sleep?.timeAsleepMinutes ?? null));
    const avgInBedMin = avg(withSleep.map((d) => d.sleep?.timeInBedMinutes ?? null));

    const efficiencies = withSleep.map((d) => {
        const asleep = d.sleep?.timeAsleepMinutes ?? null;
        const inBed = d.sleep?.timeInBedMinutes ?? null;
        if (asleep == null || inBed == null || inBed <= 0) return null;
        return (asleep / inBed) * 100;
    });

    return {
        daysWithSleep,
        avgScore,
        avgAsleepMin,
        avgInBedMin,
        avgEfficiencyPct: avg(efficiencies),

        avgRemMin: avg(withSleep.map((d) => d.sleep?.remMinutes ?? null)),
        avgCoreMin: avg(withSleep.map((d) => d.sleep?.coreMinutes ?? null)),
        avgDeepMin: avg(withSleep.map((d) => d.sleep?.deepMinutes ?? null)),
        avgAwakeMin: avg(withSleep.map((d) => d.sleep?.awakeMinutes ?? null)),
    };
}

type Props = { traineeId: string; weekKey: string };

export function TrainerRecoverySection({ traineeId, weekKey }: Props) {
    const { colors } = useTheme();

    const weekStart = React.useMemo(() => weekKeyToStartDate(weekKey) ?? new Date(), [weekKey]);

    const from = React.useMemo<ISODate>(() => safeIsoDate(weekStart), [weekStart]);
    const to = React.useMemo<ISODate>(() => safeIsoDate(addDays(weekStart, 6)), [weekStart]);

    const q = useTrainerRecovery({ traineeId, from, to });

    if (q.isLoading) {
        return (
            <View style={[styles.center, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <ActivityIndicator />
                <Text style={{ color: colors.mutedText, fontWeight: "800" }}>Cargando recuperación…</Text>
            </View>
        );
    }

    if (q.isError) {
        return (
            <View style={[styles.center, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={{ color: colors.mutedText, fontWeight: "800" }}>No se pudo cargar recuperación.</Text>
                <Pressable
                    onPress={() => q.refetch()}
                    style={({ pressed }) => ({
                        marginTop: 10,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                        opacity: pressed ? 0.92 : 1,
                    })}
                >
                    <Text style={{ fontWeight: "800", color: colors.text }}>Reintentar</Text>
                </Pressable>
            </View>
        );
    }

    const data = q.data ?? null;
    const days = Array.isArray(data?.days) ? data!.days : [];

    if (days.length === 0) {
        return (
            <View style={[styles.center, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={{ color: colors.mutedText, fontWeight: "800" }}>Sin datos de recuperación.</Text>
                <Text style={{ color: colors.mutedText, fontWeight: "700" }}>No hay días en este rango.</Text>
            </View>
        );
    }

    const agg = buildSleepAgg(days);

    return (
        <View style={{ gap: 12 }}>
            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={{ fontWeight: "800", color: colors.text }}>Recuperación (sueño)</Text>
                <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                    Semana {weekKey} · {from} → {to}
                </Text>

                <View style={{ height: 12 }} />

                <View style={styles.kpisRow}>
                    <Kpi title="Días con sueño" value={agg.daysWithSleep} />
                    <Kpi title="Score promedio" value={agg.avgScore == null ? "—" : String(Math.round(agg.avgScore))} />
                    <Kpi title="Tiempo dormido" value={mmToHhMm(agg.avgAsleepMin)} />
                    <Kpi title="Eficiencia" value={pct(agg.avgEfficiencyPct)} />
                </View>

                <View style={{ height: 10 }} />

                <View style={styles.kpisRow}>
                    <Kpi title="REM" value={mmToHhMm(agg.avgRemMin)} small />
                    <Kpi title="Core" value={mmToHhMm(agg.avgCoreMin)} small />
                    <Kpi title="Deep" value={mmToHhMm(agg.avgDeepMin)} small />
                    <Kpi title="Awake" value={mmToHhMm(agg.avgAwakeMin)} small />
                </View>
            </View>

            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={{ fontWeight: "800", color: colors.text }}>Detalle por día</Text>
                <Text style={{ color: colors.mutedText, fontWeight: "700" }}>Sueño + indicador de entrenamiento</Text>

                <View style={{ height: 10 }} />

                <View style={{ gap: 10 }}>
                    {days.map((d) => {
                        const asleep = d.sleep?.timeAsleepMinutes ?? null;
                        const inBed = d.sleep?.timeInBedMinutes ?? null;
                        const eff = asleep != null && inBed != null && inBed > 0 ? (asleep / inBed) * 100 : null;

                        const hasSleep = Boolean(d.sleep);
                        const hasTraining = Boolean(d.hasTraining);

                        return (
                            <View key={d.date} style={[styles.dayCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
                                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                                    <Text style={{ fontWeight: "800", color: colors.text }}>{d.date}</Text>

                                    <View style={{ flexDirection: "row", gap: 8 }}>
                                        <Chip label={hasSleep ? "Sueño" : "Sin sueño"} active={hasSleep} />
                                        <Chip label={hasTraining ? "Entrenó" : "Rest"} active={hasTraining} />
                                    </View>
                                </View>

                                {hasSleep ? (
                                    <View style={{ marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                                        <Mini title="Score" value={d.sleep?.score ?? "—"} />
                                        <Mini title="Dormido" value={mmToHhMm(d.sleep?.timeAsleepMinutes ?? null)} />
                                        <Mini title="Deep" value={mmToHhMm(d.sleep?.deepMinutes ?? null)} />
                                        <Mini title="Eficiencia" value={pct(eff)} />
                                    </View>
                                ) : (
                                    <Text style={{ marginTop: 8, color: colors.mutedText, fontWeight: "700" }}>
                                        No hay registro de sueño para este día.
                                    </Text>
                                )}
                            </View>
                        );
                    })}
                </View>
            </View>

            {null}
        </View>
    );

    function Chip({ label, active }: { label: string; active: boolean }) {
        return (
            <View
                style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: active ? colors.primary : colors.surface,
                }}
            >
                <Text style={{ fontWeight: "800", fontSize: 12, color: active ? "#fff" : colors.mutedText }}>{label}</Text>
            </View>
        );
    }

    function Kpi({ title, value, small }: { title: string; value: string | number; small?: boolean }) {
        return (
            <View style={[styles.kpiCard, { borderColor: colors.border, backgroundColor: colors.background, minWidth: small ? "45%" : "47%" }]}>
                <Text style={{ color: colors.mutedText, fontWeight: "800", fontSize: 12 }}>{title}</Text>
                <Text style={{ color: colors.text, fontWeight: "800", fontSize: 18 }} numberOfLines={1}>
                    {String(value)}
                </Text>
            </View>
        );
    }

    function Mini({ title, value }: { title: string; value: string | number }) {
        return (
            <View style={[styles.mini, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={{ color: colors.mutedText, fontWeight: "800", fontSize: 11 }}>{title}</Text>
                <Text style={{ color: colors.text, fontWeight: "800" }} numberOfLines={1}>
                    {String(value)}
                </Text>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    card: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 4 },

    kpisRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
    kpiCard: {
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 6,
    },

    dayCard: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 6 },
    mini: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, minWidth: 120, gap: 2 },

    center: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        gap: 8,
        alignItems: "center",
        justifyContent: "center",
    },
});