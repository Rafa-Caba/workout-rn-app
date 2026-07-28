// src/features/daySummary/components/DaySessionExerciseCard.tsx

/**
 * Responsive exercise card used inside an expanded Gym session.
 * Sets are rendered as wrapping chips so the content remains readable on
 * narrow phones without a horizontally cramped table.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { WorkoutExercise, WorkoutExerciseSet } from "@/src/types/workoutDay.types";

import type { DayUiColors } from "./dayDetail.helpers";
import {
    exerciseDisplayName,
    exerciseDisplaySubtitle,
    isFiniteNumber,
    normalizeSets,
} from "./dayDetail.helpers";

type Props = {
    exercise: WorkoutExercise;
    colors: DayUiColors;
};

type ExerciseSummaryItem = {
    label: string;
    value: string;
};

function formatSetWeight(set: WorkoutExerciseSet): string {
    if (!isFiniteNumber(set.weight)) return "—";
    return `${String(set.weight)} ${set.unit}`;
}

function formatSetReps(set: WorkoutExerciseSet): string {
    return isFiniteNumber(set.reps) ? String(set.reps) : "—";
}

function formatSetRpe(set: WorkoutExerciseSet): string {
    return isFiniteNumber(set.rpe) ? String(set.rpe) : "—";
}

function formatSetChip(set: WorkoutExerciseSet): string {
    const reps = formatSetReps(set);
    const weight = formatSetWeight(set);
    const rpe = formatSetRpe(set);
    const primary = weight === "—" ? `${reps} reps` : `${reps} × ${weight}`;
    const flags = [set.isWarmup ? "Calentamiento" : null, set.isDropSet ? "Drop" : null]
        .filter((value): value is string => value !== null)
        .join(" · ");

    return [primary, rpe === "—" ? null : `RPE ${rpe}`, flags || null]
        .filter((value): value is string => value !== null)
        .join(" · ");
}

function averageSetRpe(sets: WorkoutExerciseSet[]): string {
    const values = sets
        .map((set) => set.rpe)
        .filter((value): value is number => isFiniteNumber(value));

    if (values.length === 0) {
        return "—";
    }

    const average = values.reduce((total, value) => total + value, 0) / values.length;
    return Number.isInteger(average) ? String(average) : average.toFixed(1);
}

function summarizeLoad(sets: WorkoutExerciseSet[]): string {
    const values = sets
        .filter((set) => isFiniteNumber(set.weight))
        .map((set) => `${String(set.weight)} ${set.unit}`);
    const uniqueValues = Array.from(new Set(values));

    if (uniqueValues.length === 0) return "—";
    if (uniqueValues.length <= 2) return uniqueValues.join(" / ");
    return "Variada";
}

function buildSummary(exercise: WorkoutExercise, sets: WorkoutExerciseSet[]): ExerciseSummaryItem[] {
    const plannedSets = String(exercise.meta?.plan?.sets ?? "").trim();
    const plannedReps = String(exercise.meta?.plan?.reps ?? "").trim();
    const plannedLoad = String(exercise.meta?.plan?.load ?? "").trim();
    const plannedRpe = String(exercise.meta?.plan?.rpe ?? "").trim();
    const setProgress = plannedSets ? `${sets.length}/${plannedSets}` : String(sets.length);

    return [
        { label: "Sets", value: setProgress },
        { label: "Reps", value: sets.length > 0 ? "Real" : plannedReps || "—" },
        { label: "Carga", value: sets.length > 0 ? summarizeLoad(sets) : plannedLoad || "—" },
        { label: "RPE", value: sets.length > 0 ? averageSetRpe(sets) : plannedRpe || "—" },
    ];
}

export function DaySessionExerciseCard({ exercise, colors }: Props) {
    const subtitle = exerciseDisplaySubtitle(exercise);
    const sets = normalizeSets(exercise);
    const note = String(exercise.notes ?? "").trim();
    const summary = buildSummary(exercise, sets);

    return (
        <View style={[styles.exerciseCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <View style={styles.exerciseHeaderText}>
                <Text style={[styles.exerciseName, { color: colors.text }]}>
                    {exerciseDisplayName(exercise)}
                </Text>

                {subtitle ? (
                    <Text style={[styles.exerciseMeta, { color: colors.mutedText }]}>
                        {subtitle}
                    </Text>
                ) : null}

                {note ? (
                    <Text style={[styles.exerciseNotes, { color: colors.text }]}>
                        {note}
                    </Text>
                ) : null}
            </View>

            <View style={styles.summaryGrid}>
                {summary.map((item) => (
                    <View
                        key={item.label}
                        style={[styles.summaryItem, { borderColor: colors.border, backgroundColor: colors.surface }]}
                    >
                        <Text style={[styles.summaryLabel, { color: colors.mutedText }]}>{item.label}</Text>
                        <Text style={[styles.summaryValue, { color: colors.text }]} numberOfLines={2}>
                            {item.value}
                        </Text>
                    </View>
                ))}
            </View>

            {sets.length === 0 ? (
                <View style={[styles.emptyState, { borderColor: colors.border }]}>
                    <Text style={[styles.emptyText, { color: colors.mutedText }]}>Sin sets registrados.</Text>
                </View>
            ) : (
                <View style={styles.setChips}>
                    {sets.map((set) => (
                        <View
                            key={`${exercise.id}:${set.setIndex}`}
                            style={[styles.setChip, { borderColor: colors.border, backgroundColor: colors.surface }]}
                        >
                            <Text style={[styles.setChipText, { color: colors.text }]}>
                                {formatSetChip(set)}
                            </Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    exerciseCard: {
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
        gap: 11,
    },
    exerciseHeaderText: {
        gap: 4,
    },
    exerciseName: {
        fontSize: 14,
        fontWeight: "900",
        lineHeight: 19,
    },
    exerciseMeta: {
        fontSize: 11,
        fontWeight: "800",
    },
    exerciseNotes: {
        fontSize: 12,
        fontWeight: "600",
        lineHeight: 18,
    },
    summaryGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 7,
    },
    summaryItem: {
        flexGrow: 1,
        flexBasis: "47%",
        minWidth: 108,
        borderWidth: 1,
        borderRadius: 11,
        paddingHorizontal: 9,
        paddingVertical: 7,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 6,
    },
    summaryLabel: {
        fontSize: 10,
        fontWeight: "700",
    },
    summaryValue: {
        flexShrink: 1,
        fontSize: 11,
        fontWeight: "900",
        textAlign: "right",
    },
    setChips: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 7,
    },
    setChip: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 7,
        maxWidth: "100%",
    },
    setChipText: {
        fontSize: 11,
        fontWeight: "800",
    },
    emptyState: {
        borderWidth: 1,
        borderStyle: "dashed",
        borderRadius: 12,
        padding: 11,
    },
    emptyText: {
        fontSize: 12,
        fontWeight: "700",
    },
});
