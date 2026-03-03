// src/features/trainer/components/TrainerDaySummarySection.tsx
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useTrainerDay } from "@/src/hooks/trainer/useTrainerDay";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { ISODate, PlannedRoutine, WorkoutDay } from "@/src/types/workoutDay.types";

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

function calcEfficiency(sleep: WorkoutDay["sleep"]): number | null {
    if (!sleep) return null;
    const asleep = sleep.timeAsleepMinutes ?? null;
    const inBed = sleep.timeInBedMinutes ?? null;
    if (asleep == null || inBed == null || inBed <= 0) return null;
    return (asleep / inBed) * 100;
}

function hasTrainingSessions(day: WorkoutDay | null): boolean {
    const sessions = Array.isArray(day?.training?.sessions) ? (day!.training!.sessions as any[]) : [];
    return sessions.length > 0;
}

type Props = { traineeId: string; date: ISODate };

export function TrainerDaySummarySection({ traineeId, date }: Props) {
    const { colors } = useTheme();
    const q = useTrainerDay({ traineeId, date });

    if (q.isLoading) {
        return (
            <View style={[styles.center, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <ActivityIndicator />
                <Text style={{ color: colors.mutedText, fontWeight: "800" }}>Cargando resumen del día…</Text>
            </View>
        );
    }

    if (q.isError) {
        return (
            <View style={[styles.center, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={{ color: colors.mutedText, fontWeight: "800" }}>No se pudo cargar el día.</Text>
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

    const day = q.data?.day ?? null;

    if (!day) {
        return (
            <View style={[styles.center, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={{ color: colors.mutedText, fontWeight: "800" }}>Sin datos para este día.</Text>
                <Text style={{ color: colors.mutedText, fontWeight: "700" }}>No existe WorkoutDay para esta fecha.</Text>
            </View>
        );
    }

    const eff = calcEfficiency(day.sleep);
    const trainingExists = hasTrainingSessions(day);

    const planned: PlannedRoutine | null = day.plannedRoutine ?? null;
    const plannedExercises = Array.isArray(planned?.exercises) ? planned!.exercises : [];
    const plannedCount = plannedExercises.length;

    const sleep = day.sleep ?? null;

    return (
        <View style={{ gap: 12 }}>
            {/* Header mini */}
            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={{ fontWeight: "800", color: colors.text }}>Resumen del día</Text>
                <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                    Fecha: {day.date} · Semana: {day.weekKey}
                </Text>

                <View style={{ height: 10 }} />

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    <Chip label={sleep ? "Sueño" : "Sin sueño"} active={Boolean(sleep)} />
                    <Chip label={planned ? "Plan asignado" : "Sin plan"} active={Boolean(planned)} />
                    <Chip label={trainingExists ? "Entrenó" : "Sin entrenamiento"} active={trainingExists} />
                </View>
            </View>

            {/* Sleep */}
            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={{ fontWeight: "800", color: colors.text }}>Sueño</Text>
                <Text style={{ color: colors.mutedText, fontWeight: "700" }}>Bloque de sueño del día</Text>

                <View style={{ height: 10 }} />

                {!sleep ? (
                    <Text style={{ color: colors.mutedText, fontWeight: "800" }}>No hay registro de sueño.</Text>
                ) : (
                    <View style={styles.kpisRow}>
                        <Kpi title="Score" value={sleep.score ?? "—"} />
                        <Kpi title="Dormido" value={mmToHhMm(sleep.timeAsleepMinutes)} />
                        <Kpi title="En cama" value={mmToHhMm(sleep.timeInBedMinutes)} />
                        <Kpi title="Eficiencia" value={pct(eff)} />

                        <Kpi title="REM" value={mmToHhMm(sleep.remMinutes)} small />
                        <Kpi title="Core" value={mmToHhMm(sleep.coreMinutes)} small />
                        <Kpi title="Deep" value={mmToHhMm(sleep.deepMinutes)} small />
                        <Kpi title="Awake" value={mmToHhMm(sleep.awakeMinutes)} small />
                    </View>
                )}
            </View>

            {/* Planned routine */}
            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={{ fontWeight: "800", color: colors.text }}>Plan asignado</Text>
                <Text style={{ color: colors.mutedText, fontWeight: "700" }}>plannedRoutine + plannedMeta</Text>

                <View style={{ height: 10 }} />

                {!planned ? (
                    <Text style={{ color: colors.mutedText, fontWeight: "800" }}>No hay plan asignado para este día.</Text>
                ) : (
                    <View style={{ gap: 10 }}>
                        <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.background }]}>
                            <Text style={{ color: colors.mutedText, fontWeight: "800", fontSize: 12 }}>Resumen</Text>
                            <Text style={{ color: colors.text, fontWeight: "800" }} numberOfLines={1}>
                                {planned.sessionType ?? "—"}
                                {planned.focus ? ` · ${planned.focus}` : ""}
                            </Text>

                            {planned.tags?.length ? (
                                <View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                                    {planned.tags.map((tag) => (
                                        <View key={tag} style={[styles.pill, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                                            <Text style={{ fontWeight: "800", color: colors.mutedText, fontSize: 12 }}>{tag}</Text>
                                        </View>
                                    ))}
                                </View>
                            ) : null}

                            {planned.notes ? (
                                <Text style={{ marginTop: 8, color: colors.mutedText, fontWeight: "700" }}>
                                    {planned.notes}
                                </Text>
                            ) : null}

                            <Text style={{ marginTop: 8, color: colors.mutedText, fontWeight: "800" }}>
                                Ejercicios: <Text style={{ color: colors.text, fontWeight: "800" }}>{plannedCount}</Text>
                            </Text>
                        </View>

                        {plannedCount > 0 ? (
                            <View style={{ gap: 8 }}>
                                {plannedExercises.map((ex) => (
                                    <View key={String(ex.id)} style={[styles.box, { borderColor: colors.border, backgroundColor: colors.background }]}>
                                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                                            <Text style={{ fontWeight: "800", color: colors.text, flex: 1 }} numberOfLines={1}>
                                                {ex.movementName ?? ex.name ?? "—"}
                                            </Text>
                                            <Text style={{ fontWeight: "800", color: colors.mutedText }}>
                                                {ex.sets != null ? `${ex.sets}x` : ""}
                                                {ex.reps ? ` ${ex.reps}` : ""}
                                                {ex.rpe != null ? ` · RPE ${ex.rpe}` : ""}
                                            </Text>
                                        </View>

                                        {(ex.load || ex.notes) ? (
                                            <Text style={{ marginTop: 6, color: colors.mutedText, fontWeight: "700" }}>
                                                {ex.load ? `Carga: ${ex.load}` : ""}
                                                {ex.load && ex.notes ? " · " : ""}
                                                {ex.notes ? ex.notes : ""}
                                            </Text>
                                        ) : null}
                                    </View>
                                ))}
                            </View>
                        ) : null}

                        {day.plannedMeta ? (
                            <Text style={{ color: colors.mutedText, fontWeight: "800" }}>
                                Asignado: {day.plannedMeta.plannedAt}
                                {day.plannedMeta.source ? ` · Fuente: ${day.plannedMeta.source}` : ""}
                            </Text>
                        ) : null}
                    </View>
                )}
            </View>

            {/* Training */}
            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={{ fontWeight: "800", color: colors.text }}>Entrenamiento (real)</Text>
                <Text style={{ color: colors.mutedText, fontWeight: "700" }}>training.sessions</Text>

                <View style={{ height: 10 }} />

                {!trainingExists ? (
                    <Text style={{ color: colors.mutedText, fontWeight: "800" }}>No hay sesiones registradas.</Text>
                ) : (
                    <View style={{ gap: 8 }}>
                        {(day.training?.sessions ?? []).map((s: any) => (
                            <View key={String(s.id ?? s._id)} style={[styles.box, { borderColor: colors.border, backgroundColor: colors.background }]}>
                                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                                    <Text style={{ fontWeight: "800", color: colors.text, flex: 1 }} numberOfLines={1}>
                                        {s.type ?? "—"}
                                    </Text>
                                    <Text style={{ fontWeight: "800", color: colors.mutedText }}>
                                        {s.durationSeconds != null ? `${Math.round(s.durationSeconds / 60)} min` : "—"}
                                    </Text>
                                </View>

                                <Text style={{ marginTop: 6, color: colors.mutedText, fontWeight: "800" }}>
                                    {s.activeKcal != null ? `${s.activeKcal} kcal` : "—"}
                                    {s.avgHr != null ? ` · HR ${s.avgHr}` : ""}
                                    {s.maxHr != null ? `/${s.maxHr}` : ""}
                                </Text>

                                {s.notes ? (
                                    <Text style={{ marginTop: 6, color: colors.mutedText, fontWeight: "700" }}>
                                        {s.notes}
                                    </Text>
                                ) : null}
                            </View>
                        ))}
                    </View>
                )}
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

    box: { borderWidth: 1, borderRadius: 14, padding: 10, gap: 2 },

    pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },

    center: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        gap: 8,
        alignItems: "center",
        justifyContent: "center",
    },
});