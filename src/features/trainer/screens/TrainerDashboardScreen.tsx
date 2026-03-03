// src/features/trainer/screens/TrainerDashboardScreen.tsx
import { addWeeks, format } from "date-fns";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { DatePickerField } from "@/src/features/components/DatePickerField";
import { useTrainerTrainees } from "@/src/hooks/trainer/useTrainerTrainees";
import { useTheme } from "@/src/theme/ThemeProvider";
import { toWeekKey, weekKeyToStartDate } from "@/src/utils/weekKey";

import { TrainerAssignRoutineSection } from "../components/TrainerAssignRoutineSection";
import { TrainerCoachProfileCard } from "../components/TrainerCoachProfileCard";
import { TrainerDaySummarySection } from "../components/TrainerDaySummarySection";
import { TrainerEmptyState } from "../components/TrainerEmptyState";
import { TrainerRecoverySection } from "../components/TrainerRecoverySection";
import { TrainerTabs, type TrainerTab } from "../components/TrainerTabs";
import { TrainerTraineePicker, normalizeTrainees } from "../components/TrainerTraineePicker";
import { TrainerWeeklySummarySection } from "../components/TrainerWeeklySummarySection";

function todayIsoLocal(): string {
    return format(new Date(), "yyyy-MM-dd");
}

export function TrainerDashboardScreen() {
    const { colors } = useTheme();

    const [tab, setTab] = React.useState<TrainerTab>("weekly");

    const [selectedTraineeId, setSelectedTraineeId] = React.useState<string>("");
    const [weekKey, setWeekKey] = React.useState<string>(() => toWeekKey(new Date()));
    const [dateIso, setDateIso] = React.useState<string>(() => todayIsoLocal());

    const traineesQ = useTrainerTrainees();

    const trainees = React.useMemo(() => normalizeTrainees(traineesQ.data ?? []), [traineesQ.data]);

    // Clear selection if trainee disappears
    React.useEffect(() => {
        if (!selectedTraineeId) return;
        const stillExists = trainees.some((t) => t.id === selectedTraineeId);
        if (!stillExists && traineesQ.isFetched) {
            setSelectedTraineeId("");
        }
    }, [selectedTraineeId, trainees, traineesQ.isFetched]);

    const hasSelected = Boolean(selectedTraineeId);

    const weekStart = React.useMemo(() => {
        try {
            return weekKeyToStartDate(weekKey);
        } catch {
            return new Date();
        }
    }, [weekKey]);

    const weekRangeLabel = React.useMemo(() => {
        const from = format(weekStart, "yyyy-MM-dd");
        const to = format(addWeeks(weekStart, 1), "yyyy-MM-dd");
        return `${from} → ${to}`;
    }, [weekStart]);

    const onPrevWeek = () => setWeekKey(toWeekKey(addWeeks(weekStart, -1)));
    const onNextWeek = () => setWeekKey(toWeekKey(addWeeks(weekStart, 1)));

    const tabDescription =
        tab === "weekly"
            ? "Resumen semanal (solo lectura)."
            : tab === "day"
                ? "Resumen por día (solo lectura)."
                : tab === "recovery"
                    ? "Recuperación y sueño (solo lectura)."
                    : "Asignar rutina planificada (escritura).";

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={styles.container}
        >
            <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>Panel de entrenador</Text>
                <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                    Selecciona un trainee para ver su resumen semanal, día, recuperación y asignar rutina.
                </Text>
            </View>

            {/* Controls */}
            <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <View style={{ gap: 10 }}>
                    <View style={styles.controlsTop}>
                        <View style={{ flex: 1, gap: 6 }}>
                            <Text style={{ fontSize: 12, fontWeight: "800", color: colors.mutedText }}>Trainee</Text>

                            <TrainerTraineePicker
                                valueId={selectedTraineeId}
                                items={trainees}
                                loading={traineesQ.isLoading}
                                error={traineesQ.isError}
                                onRetry={() => traineesQ.refetch()}
                                onSelect={(id) => setSelectedTraineeId(id)}
                                onClear={() => setSelectedTraineeId("")}
                            />
                        </View>

                        <View style={{ flex: 1, gap: 6 }}>
                            <Text style={{ fontSize: 12, fontWeight: "800", color: colors.mutedText }}>Secciones</Text>
                            <TrainerTabs value={tab} onChange={setTab} disabled={!hasSelected} />
                        </View>
                    </View>

                    <Text style={{ color: colors.mutedText, fontWeight: "800", fontSize: 12 }}>{tabDescription}</Text>

                    <View style={styles.weekRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.mutedText, fontWeight: "800", fontSize: 12 }}>
                                Semana: <Text style={{ color: colors.text }}>{weekKey}</Text>{" "}
                                <Text style={{ color: colors.mutedText }}>({weekRangeLabel})</Text>
                            </Text>
                        </View>

                        <View style={styles.weekButtons}>
                            <Pressable
                                onPress={onPrevWeek}
                                disabled={!hasSelected}
                                style={({ pressed }) => ({
                                    paddingHorizontal: 10,
                                    paddingVertical: 10,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    backgroundColor: colors.background,
                                    opacity: !hasSelected ? 0.5 : pressed ? 0.8 : 1,
                                })}
                            >
                                <Text style={{ fontWeight: "800", color: colors.text }}>Semana anterior</Text>
                            </Pressable>

                            <Pressable
                                onPress={onNextWeek}
                                disabled={!hasSelected}
                                style={({ pressed }) => ({
                                    paddingHorizontal: 10,
                                    paddingVertical: 10,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    backgroundColor: colors.background,
                                    opacity: !hasSelected ? 0.5 : pressed ? 0.8 : 1,
                                })}
                            >
                                <Text style={{ fontWeight: "800", color: colors.text }}>Semana siguiente</Text>
                            </Pressable>
                        </View>

                        <View style={{ justifyContent: 'center', flexDirection: 'row', alignItems: 'center' }}>
                            <DatePickerField
                                label="Selecciona Día"
                                value={dateIso}
                                onChange={setDateIso}
                                displayFormat="MM/dd/yyyy"
                                disabled={!hasSelected}
                            />
                        </View>
                    </View>
                </View>
            </View>

            {/* Content */}
            {!hasSelected ? (
                <TrainerEmptyState />
            ) : (
                <View style={{ gap: 12 }}>
                    <TrainerCoachProfileCard traineeId={selectedTraineeId} />

                    {tab === "weekly" ? (
                        <TrainerWeekly traineeId={selectedTraineeId} weekKey={weekKey} />
                    ) : null}

                    {tab === "day" ? (
                        <TrainerDay traineeId={selectedTraineeId} date={dateIso as any} />
                    ) : null}

                    {tab === "recovery" ? (
                        <TrainerRecovery traineeId={selectedTraineeId} weekKey={weekKey} />
                    ) : null}

                    {tab === "assign" ? (
                        <TrainerAssign traineeId={selectedTraineeId} weekKey={weekKey as any} date={dateIso as any} />
                    ) : null}
                </View>
            )}
        </ScrollView>
    );
}

function TrainerWeekly({ traineeId, weekKey }: { traineeId: string; weekKey: string }) {
    return <TrainerWeeklySummarySection traineeId={traineeId} weekKey={weekKey} />;
}

function TrainerDay({ traineeId, date }: { traineeId: string; date: any }) {
    return <TrainerDaySummarySection traineeId={traineeId} date={date} />;
}

function TrainerRecovery({ traineeId, weekKey }: { traineeId: string; weekKey: string }) {
    return <TrainerRecoverySection traineeId={traineeId} weekKey={weekKey} />;
}

function TrainerAssign({ traineeId, weekKey, date }: { traineeId: string; weekKey: any; date: any }) {
    return <TrainerAssignRoutineSection traineeId={traineeId} weekKey={weekKey} date={date} />;
}

const styles = StyleSheet.create({
    container: { padding: 16, gap: 14, paddingBottom: 32 },

    card: { borderWidth: 1, borderRadius: 16, padding: 12 },

    controlsTop: { flexDirection: "column", gap: 10 },

    weekRow: {
        paddingTop: 15,
        flexDirection: "column",
        gap: 10,
        // flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
    },

    weekButtons: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
});