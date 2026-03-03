// src/features/trainer/components/TrainerWeeklySummarySection.tsx
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useTrainerWeekSummary } from "@/src/hooks/trainer/useTrainerWeekSummary";
import { defaultTrainerWeekSummaryParams } from "@/src/services/workout/trainer.service";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { CalendarDayFull, WeekViewResponse } from "@/src/types/workoutDay.types";

function fmtMaybe(n: number | null | undefined, suffix = ""): string {
    if (n === null || n === undefined) return "—";
    return `${n}${suffix}`;
}

function minutesToHhMm(minutes: number | null | undefined): string {
    if (minutes === null || minutes === undefined) return "—";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h <= 0) return `${m}m`;
    return `${h}h ${m}m`;
}

function secondsToHhMm(seconds: number | null | undefined): string {
    if (seconds === null || seconds === undefined) return "—";
    return minutesToHhMm(Math.round(seconds / 60));
}

function yesNoEs(v: boolean): string {
    return v ? "sí" : "no";
}

function hasPlanned(day: CalendarDayFull): boolean {
    const pr = day.plannedRoutine ?? null;
    const hasType = Boolean((pr?.sessionType ?? "").trim());
    const hasFocus = Boolean((pr?.focus ?? "").trim());
    const exCount = pr?.exercises?.length ?? 0;
    return hasType || hasFocus || exCount > 0;
}

function DayRow({ day }: { day: CalendarDayFull }) {
    const { colors } = useTheme();

    const date = day.date ?? "—";
    const hasSleep = Boolean(day.hasSleep ?? day.sleep != null);
    const hasTraining = Boolean(day.hasTraining ?? day.training != null);

    const sleepScore = day.sleepSummary?.score ?? day.sleep?.score ?? null;
    const asleepMin = day.sleepSummary?.timeAsleepMinutes ?? day.sleep?.timeAsleepMinutes ?? null;

    const sessionsCount = day.trainingSummary?.sessionsCount ?? (day.training?.sessions?.length ?? 0);
    const effortRpe = day.trainingSummary?.dayEffortRpe ?? day.training?.dayEffortRpe ?? null;

    const planned = hasPlanned(day);

    return (
        <View style={[styles.dayCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <View style={{ gap: 6 }}>
                <Text style={{ fontWeight: "800", color: colors.text }}>{date}</Text>

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    <Badge label={`Planeado: ${yesNoEs(planned)}`} active={planned} />
                    <Badge label={`Sueño: ${yesNoEs(hasSleep)}`} active={hasSleep} />
                    <Badge label={`Entrenado: ${yesNoEs(hasTraining)}`} active={hasTraining} />
                </View>
            </View>

            <View style={{ height: 10 }} />

            <View style={{ flexDirection: "row", gap: 10, flexWrap: "nowrap" }}>
                <MiniKpi title="Sueño" value={`${minutesToHhMm(asleepMin)} (${fmtMaybe(sleepScore)})`} />
                <MiniKpi title="Entrenado" value={`${sessionsCount} sesión(es) · RPE ${fmtMaybe(effortRpe)}`} />
            </View>

            {planned && day.plannedRoutine ? (
                <View style={[styles.plannedBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <Text style={{ fontSize: 11, fontWeight: "800", color: colors.mutedText }}>Rutina planeada</Text>
                    <Text style={{ fontWeight: "800", color: colors.text }} numberOfLines={1}>
                        {day.plannedRoutine.sessionType ?? "—"}
                        {day.plannedRoutine.focus ? ` · ${day.plannedRoutine.focus}` : ""}
                    </Text>
                    <Text style={{ color: colors.mutedText, fontWeight: "700", fontSize: 12 }}>
                        {(day.plannedRoutine.exercises?.length ?? 0)} ejercicio(s)
                    </Text>
                </View>
            ) : null}

            {null}

            {/*
                Local components inside for consistent style without extra files.
            */}
        </View>
    );

    function Badge({ label, active }: { label: string; active: boolean }) {
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

    function MiniKpi({ title, value }: { title: string; value: string }) {
        return (
            <View
                style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    minWidth: 150,
                    gap: 2,
                }}
            >
                <Text style={{ fontSize: 11, fontWeight: "800", color: colors.mutedText }}>{title}</Text>
                <Text style={{ fontSize: 13, fontWeight: "800", color: colors.text }} numberOfLines={1}>
                    {value}
                </Text>
            </View>
        );
    }
}

type Props = { traineeId: string; weekKey: string };

export function TrainerWeeklySummarySection({ traineeId, weekKey }: Props) {
    const { colors } = useTheme();

    const q = useTrainerWeekSummary({
        traineeId,
        ...defaultTrainerWeekSummaryParams(weekKey as any),
    });

    if (q.isLoading) {
        return (
            <View style={[styles.center, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <ActivityIndicator />
                <Text style={{ color: colors.mutedText, fontWeight: "800" }}>Cargando resumen semanal…</Text>
            </View>
        );
    }

    if (q.isError) {
        return (
            <View style={[styles.center, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={{ color: colors.mutedText, fontWeight: "900" }}>No se pudo cargar el resumen semanal.</Text>
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
                    <Text style={{ fontWeight: "900", color: colors.text }}>Reintentar</Text>
                </Pressable>
            </View>
        );
    }

    const data: WeekViewResponse | null = q.data ?? null;

    if (!data) {
        return (
            <View style={[styles.center, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={{ color: colors.mutedText, fontWeight: "900" }}>Sin datos para esta semana.</Text>
            </View>
        );
    }

    const rollups = data.rollups;
    const trainingTotals = rollups?.trainingTotals;
    const sleepAvg = rollups?.sleepAverages;

    return (
        <View style={{ gap: 12 }}>
            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={{ fontWeight: "900", color: colors.text }}>Semana {data.weekKey}</Text>
                <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                    Rango: {data.range.from} → {data.range.to}
                </Text>

                <View style={{ height: 12 }} />

                <View style={styles.kpisRow}>
                    <Kpi title="Sesiones" value={fmtMaybe(trainingTotals?.totalSessions ?? null)} />
                    <Kpi title="Duración total" value={secondsToHhMm(trainingTotals?.totalDurationSeconds ?? null)} />
                    <Kpi title="Kcal activas" value={fmtMaybe(trainingTotals?.totalActiveKcal ?? null)} />
                    <Kpi title="Kcal totales" value={fmtMaybe(trainingTotals?.totalKcal ?? null)} />
                </View>

                <View style={{ height: 10 }} />

                <View style={styles.kpisRow}>
                    <Kpi title="Días con sueño" value={fmtMaybe(sleepAvg?.daysWithSleep ?? null)} />
                    <Kpi title="Prom. dormido" value={minutesToHhMm(sleepAvg?.avgTimeAsleepMinutes ?? null)} />
                    <Kpi title="Prom. Sleep Score" value={fmtMaybe(sleepAvg?.avgScore ?? null)} />
                    <Kpi title="Prom. Deep" value={fmtMaybe(sleepAvg?.avgDeepMinutes ?? null, "m")} />
                </View>

                {rollups?.trainingTypes?.length ? (
                    <View style={{ marginTop: 12, gap: 8 }}>
                        <Text style={{ fontWeight: "800", color: colors.text }}>Tipos de entrenamiento</Text>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                            {rollups.trainingTypes.map((tt) => (
                                <View
                                    key={tt.type}
                                    style={{
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                        backgroundColor: colors.background,
                                        borderRadius: 999,
                                        paddingHorizontal: 10,
                                        paddingVertical: 6,
                                    }}
                                >
                                    <Text style={{ fontWeight: "800", color: colors.text, fontSize: 12 }}>
                                        {tt.type} ·{" "}
                                        <Text style={{ color: colors.mutedText }}>
                                            {tt.sessions} sesión(es)
                                        </Text>
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                ) : null}
            </View>

            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={{ fontWeight: "800", color: colors.text }}>Días</Text>
                <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                    Vista rápida de sueño, entrenamiento y rutina planificada por día.
                </Text>

                <View style={{ height: 10 }} />

                <View style={{ gap: 10 }}>
                    {(data.days ?? []).map((d, idx) => (
                        <DayRow key={`${d.date ?? "x"}:${idx}`} day={d} />
                    ))}
                </View>
            </View>

            {null}

            {/*
                Kpi local component
            */}
        </View>
    );

    function Kpi({ title, value }: { title: string; value: string }) {
        return (
            <View style={[styles.kpiCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Text style={{ color: colors.mutedText, fontWeight: "800", fontSize: 12 }}>{title}</Text>
                <Text style={{ color: colors.text, fontWeight: "800", fontSize: 18 }} numberOfLines={1}>
                    {value}
                </Text>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    card: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 6 },

    kpisRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
    kpiCard: {
        flex: 1,
        minWidth: "45%",
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 6,
    },

    dayCard: { borderWidth: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 10, gap: 6 },
    plannedBox: { borderWidth: 1, borderRadius: 14, padding: 10, gap: 2 },

    center: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        gap: 8,
        alignItems: "center",
        justifyContent: "center",
    },
});