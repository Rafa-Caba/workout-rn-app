// src/features/planVsReal/components/PlanVsRealTable.tsx
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { DayKey } from "@/src/utils/routines/plan";

export type PlanVsActualPlanned = {
    sessionType: string | null;
    focus: string | null;
    tags: string[] | null;
};

export type GymCheckSummaryUi = {
    durationMin: number | null;
    notes: string | null;
    totalPlannedExercises: number;
    doneExercises: number;
    hasAnyCheck: boolean;
};

export type PlanVsActualDayUi = {
    dayKey: DayKey;
    date: string; // yyyy-MM-dd
    planned: PlanVsActualPlanned | null;
    gymCheck: GymCheckSummaryUi | null;
    actualSessionsCount: number;
    status: string;
};

type Props = {
    days: PlanVsActualDayUi[];
};

const MIN_TABLE_WIDTH = 720;

function statusLabelEs(status: string): string {
    const s = (status || "").toLowerCase().trim();

    if (s === "done" || s === "hecho") return "hecho";
    if (s === "rest" || s === "descanso") return "descanso";
    if (s === "extra") return "extra";
    if (s === "missed" || s === "fallo" || s === "omitido") return "fallo";

    return s.length ? s : "—";
}

function plannedLabelEs(p: PlanVsActualPlanned | null): string {
    if (!p) return "—";
    const st = (p.sessionType ?? "").trim();
    const fc = (p.focus ?? "").trim();
    const tags = Array.isArray(p.tags) ? p.tags.filter(Boolean) : [];

    if (st) return st;
    if (fc) return fc;
    if (tags.length) return tags.join(", ");
    return "—";
}

function gymCheckLabelEs(g: GymCheckSummaryUi | null): string {
    if (!g || !g.hasAnyCheck) return "—";

    const parts: string[] = [];

    if (g.totalPlannedExercises > 0) {
        parts.push(`${g.doneExercises}/${g.totalPlannedExercises}`);
    } else {
        parts.push("✓");
    }

    if (g.durationMin != null) parts.push(`${g.durationMin}m`);

    return parts.join(" • ");
}

function actualLabelEs(actualSessionsCount: number): string {
    if (!Number.isFinite(actualSessionsCount) || actualSessionsCount <= 0) return "—";
    return actualSessionsCount === 1 ? "1 sesión" : `${actualSessionsCount} sesiones`;
}

export function PlanVsRealTable({ days }: Props) {
    const { colors } = useTheme();

    return (
        <View style={[styles.tableCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ minWidth: MIN_TABLE_WIDTH }}>
                <View style={{ minWidth: MIN_TABLE_WIDTH, flex: 1 }}>
                    <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.th, { color: colors.mutedText, width: 70 }]}>Día</Text>
                        <Text style={[styles.th, { color: colors.mutedText, width: 120 }]}>Fecha</Text>
                        <Text style={[styles.th, { color: colors.mutedText, width: 170 }]}>Plan</Text>
                        <Text style={[styles.th, { color: colors.mutedText, width: 140 }]}>Gym Check</Text>
                        <Text style={[styles.th, { color: colors.mutedText, width: 140 }]}>Real</Text>
                        <Text style={[styles.th, { color: colors.mutedText, width: 120 }]}>Estado</Text>
                    </View>

                    <ScrollView style={{ maxHeight: 360 }} nestedScrollEnabled>
                        {days.map((d) => (
                            <View key={`${d.dayKey}-${d.date}`} style={[styles.tr, { borderBottomColor: colors.border }]}>
                                <Text style={[styles.td, { color: colors.text, width: 70 }]} numberOfLines={1}>
                                    {d.dayKey}
                                </Text>

                                <Text style={[styles.td, { color: colors.text, width: 120 }]} numberOfLines={1}>
                                    {d.date}
                                </Text>

                                <Text style={[styles.td, { color: colors.text, width: 170 }]} numberOfLines={1}>
                                    {plannedLabelEs(d.planned)}
                                </Text>

                                <Text style={[styles.td, { color: colors.text, width: 140 }]} numberOfLines={1}>
                                    {gymCheckLabelEs(d.gymCheck)}
                                </Text>

                                <Text style={[styles.td, { color: colors.text, width: 140 }]} numberOfLines={1}>
                                    {actualLabelEs(d.actualSessionsCount)}
                                </Text>

                                <Text style={[styles.td, { color: colors.text, width: 120 }]} numberOfLines={1}>
                                    {statusLabelEs(d.status)}
                                </Text>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    tableCard: { borderWidth: 1, borderRadius: 16, overflow: "hidden" },

    tableHeader: {
        flexDirection: "row",
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    th: { fontWeight: "800", fontSize: 12 },

    tr: {
        flexDirection: "row",
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    td: { fontWeight: "800", fontSize: 13 },
});