// src/features/daySummary/components/DaySessionExerciseCard.tsx

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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

function formatSetWeight(set: WorkoutExerciseSet): string {
    if (set.weight === null) return "—";
    if (!isFiniteNumber(set.weight)) return "—";

    return `${String(set.weight)} ${set.unit}`;
}

function formatSetReps(set: WorkoutExerciseSet): string {
    return set.reps !== null ? String(set.reps) : "—";
}

function formatSetRpe(set: WorkoutExerciseSet): string {
    return set.rpe !== null ? String(set.rpe) : "—";
}

export function DaySessionExerciseCard({ exercise, colors }: Props) {
    const [open, setOpen] = React.useState(false);

    const subtitle = exerciseDisplaySubtitle(exercise);
    const sets = normalizeSets(exercise);
    const note = String(exercise.notes ?? "").trim();

    return (
        <View style={[styles.exerciseCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Pressable onPress={() => setOpen((prev) => !prev)} style={styles.exerciseHeader}>
                <View style={styles.exerciseHeaderText}>
                    <Text style={[styles.exerciseName, { color: colors.text }]} numberOfLines={1}>
                        {open ? "▼" : "▶"} {exerciseDisplayName(exercise)}
                    </Text>

                    {subtitle ? (
                        <Text style={[styles.exerciseMeta, { color: colors.mutedText }]} numberOfLines={1}>
                            {subtitle}
                        </Text>
                    ) : null}
                </View>
            </Pressable>

            {open ? (
                <View style={styles.exerciseBody}>
                    <View style={[styles.exerciseNotesBox, { borderColor: colors.border }]}>
                        <Text style={[styles.exerciseNotesLabel, { color: colors.mutedText }]}>📝 Notas</Text>
                        <Text style={[styles.exerciseNotesText, { color: colors.text }]} numberOfLines={4}>
                            {note || "—"}
                        </Text>
                    </View>

                    <View style={styles.setTable}>
                        <View style={[styles.setHeaderRow, { borderColor: colors.border }]}>
                            <Text style={[styles.setHeaderCell, { color: colors.mutedText }]}>Serie</Text>
                            <Text style={[styles.setHeaderCell, { color: colors.mutedText }]}>Reps</Text>
                            <Text style={[styles.setHeaderCell, { color: colors.mutedText }]}>Carga</Text>
                            <Text style={[styles.setHeaderCell, { color: colors.mutedText }]}>RPE</Text>
                        </View>

                        {sets.length === 0 ? (
                            <Text style={[styles.emptyText, { color: colors.mutedText }]}>Sin sets.</Text>
                        ) : (
                            sets.map((set) => (
                                <View
                                    key={`${exercise.id}:${set.setIndex}`}
                                    style={[styles.setRow, { borderColor: colors.border }]}
                                >
                                    <Text style={[styles.setCell, { color: colors.text }]}>{String(set.setIndex)}</Text>
                                    <Text style={[styles.setCell, { color: colors.text }]}>{formatSetReps(set)}</Text>
                                    <Text style={[styles.setCell, { color: colors.text }]}>{formatSetWeight(set)}</Text>
                                    <Text style={[styles.setCell, { color: colors.text }]}>{formatSetRpe(set)}</Text>
                                </View>
                            ))
                        )}
                    </View>
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    exerciseCard: {
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
        gap: 10,
    },
    exerciseHeader: {
        gap: 4,
    },
    exerciseHeaderText: {
        gap: 4,
    },
    exerciseName: {
        fontSize: 14,
        fontWeight: "900",
    },
    exerciseMeta: {
        fontSize: 12,
        fontWeight: "800",
    },
    exerciseBody: {
        gap: 10,
    },
    exerciseNotesBox: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 10,
    },
    exerciseNotesLabel: {
        fontSize: 12,
        fontWeight: "900",
    },
    exerciseNotesText: {
        marginTop: 6,
        fontSize: 13,
        fontWeight: "700",
        lineHeight: 18,
    },
    setTable: {
        gap: 8,
    },
    setHeaderRow: {
        flexDirection: "row",
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    setHeaderCell: {
        flex: 1,
        fontSize: 12,
        fontWeight: "900",
    },
    setRow: {
        flexDirection: "row",
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    setCell: {
        flex: 1,
        fontSize: 12,
        fontWeight: "800",
    },
    emptyText: {
        fontSize: 13,
        fontWeight: "700",
    },
});