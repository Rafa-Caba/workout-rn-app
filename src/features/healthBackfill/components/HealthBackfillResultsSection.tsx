// src/features/healthBackfill/components/HealthBackfillResultsSection.tsx
// Theme-aware result panel for single-date and range backfill runs.

import type { WorkoutDay, WorkoutDayBackfillResult } from "@/src/types/workoutDay.types";
import * as React from "react";
import { StyleSheet, Text, View } from "react-native";

type ThemeColors = {
    background: string;
    surface: string;
    border: string;
    text: string;
    mutedText: string;
    primary: string;
    primaryText: string;
};

export type HealthBackfillUiResult =
    | {
        kind: "single";
        date: string;
        mode: "merge" | "replace";
        day: WorkoutDay | null;
        message: string;
    }
    | {
        kind: "range";
        mode: "merge" | "replace";
        result: WorkoutDayBackfillResult | null;
        message: string;
    }
    | null;

type Props = {
    result: HealthBackfillUiResult;
    colors: ThemeColors;
};

function hasSleep(day: WorkoutDay | null): boolean {
    if (!day?.sleep) return false;

    return [
        day.sleep.timeAsleepMinutes,
        day.sleep.timeInBedMinutes,
        day.sleep.score,
        day.sleep.awakeMinutes,
        day.sleep.remMinutes,
        day.sleep.coreMinutes,
        day.sleep.deepMinutes,
    ].some((value) => typeof value === "number" && Number.isFinite(value));
}

function sessionCount(day: WorkoutDay | null): number {
    return Array.isArray(day?.training?.sessions) ? day.training.sessions.length : 0;
}

export function HealthBackfillResultsSection({ result, colors }: Props) {
    if (!result) {
        return null;
    }

    return (
        <View
            style={[
                styles.card,
                {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                },
            ]}
        >
            <Text style={[styles.title, { color: colors.text }]}>Resultado</Text>
            <Text style={[styles.subtitle, { color: colors.mutedText }]}>{result.message}</Text>

            {result.kind === "single" ? (
                <View
                    style={[
                        styles.summaryBox,
                        {
                            backgroundColor: colors.background,
                            borderColor: colors.border,
                        },
                    ]}
                >
                    <Row label="Fecha" value={result.date} colors={colors} />
                    <Row label="Modo" value={result.mode} colors={colors} />
                    <Row label="Sleep guardado" value={hasSleep(result.day) ? "Sí" : "No"} colors={colors} />
                    <Row label="Sesiones del día" value={String(sessionCount(result.day))} colors={colors} />
                </View>
            ) : (
                <>
                    <View
                        style={[
                            styles.summaryBox,
                            {
                                backgroundColor: colors.background,
                                borderColor: colors.border,
                            },
                        ]}
                    >
                        <Row label="Modo" value={result.mode} colors={colors} />
                        <Row label="Total procesados" value={String(result.result?.total ?? 0)} colors={colors} />
                        <Row label="Éxitos" value={String(result.result?.successCount ?? 0)} colors={colors} />
                        <Row label="Fallidos" value={String(result.result?.failedCount ?? 0)} colors={colors} />
                    </View>

                    <View style={[styles.table, { borderColor: colors.border }]}>
                        <View
                            style={[
                                styles.tableRow,
                                {
                                    backgroundColor: colors.background,
                                    borderBottomColor: colors.border,
                                },
                            ]}
                        >
                            <Text style={[styles.cell, styles.headerCell, styles.cellDate, { color: colors.text }]}>
                                Fecha
                            </Text>
                            <Text style={[styles.cell, styles.headerCell, styles.cellStatus, { color: colors.text }]}>
                                OK
                            </Text>
                            <Text style={[styles.cell, styles.headerCell, styles.cellError, { color: colors.text }]}>
                                Error
                            </Text>
                        </View>

                        {(result.result?.results ?? []).map((item) => (
                            <View
                                key={`${item.date}-${item.ok ? "ok" : "fail"}`}
                                style={[
                                    styles.tableRow,
                                    {
                                        borderTopColor: colors.border,
                                        backgroundColor: colors.surface,
                                    },
                                ]}
                            >
                                <Text style={[styles.cell, styles.cellDate, { color: colors.text }]}>
                                    {item.date}
                                </Text>
                                <Text style={[styles.cell, styles.cellStatus, { color: colors.text }]}>
                                    {item.ok ? "Sí" : "No"}
                                </Text>
                                <Text style={[styles.cell, styles.cellError, { color: colors.mutedText }]}>
                                    {item.error ?? "—"}
                                </Text>
                            </View>
                        ))}
                    </View>
                </>
            )}
        </View>
    );
}

function Row({
    label,
    value,
    colors,
}: {
    label: string;
    value: string;
    colors: ThemeColors;
}) {
    return (
        <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.mutedText }]}>{label}</Text>
            <Text style={[styles.rowValue, { color: colors.text }]}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 22,
        padding: 16,
        gap: 14,
        borderWidth: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: "900",
    },
    subtitle: {
        fontSize: 13,
        lineHeight: 20,
    },
    summaryBox: {
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        gap: 10,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
    },
    rowLabel: {
        flex: 1,
        fontSize: 13,
        fontWeight: "800",
    },
    rowValue: {
        flex: 1,
        fontSize: 13,
        textAlign: "right",
        fontWeight: "800",
    },
    table: {
        borderWidth: 1,
        borderRadius: 16,
        overflow: "hidden",
    },
    tableRow: {
        flexDirection: "row",
        borderTopWidth: 1,
    },
    cell: {
        paddingVertical: 12,
        paddingHorizontal: 10,
        fontSize: 12,
    },
    headerCell: {
        fontWeight: "900",
    },
    cellDate: {
        flex: 1.1,
    },
    cellStatus: {
        width: 56,
        textAlign: "center",
    },
    cellError: {
        flex: 1.5,
    },
});