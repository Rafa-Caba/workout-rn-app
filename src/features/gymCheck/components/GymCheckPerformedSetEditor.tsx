/**
 * GymCheckPerformedSetEditor
 *
 * Single performed-set editor used inside GymCheckExerciseRow.
 *
 * Responsibilities:
 * - keep local string drafts for reps / weight / rpe while typing
 * - avoid parent-state overwrite during active editing
 * - commit numeric values only on blur
 *
 * Important:
 * - only one commit source is used (`onBlur`)
 * - `onEndEditing` is intentionally not used to avoid double-commit behavior
 *   in React Native when focus changes between inputs
 */

import * as React from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { WeightUnit, WorkoutExerciseSet } from "@/src/types/workoutDay.types";

type Props = {
    index: number;
    set: WorkoutExerciseSet;
    unit: WeightUnit;
    busy: boolean;
    canRemove: boolean;
    onCommit: (patch: Partial<WorkoutExerciseSet>) => void;
    onRemove: () => void;
};

function parseNumberInput(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
}

function parseIntInput(value: string): number | null {
    const parsed = parseNumberInput(value);
    return parsed === null ? null : Math.trunc(parsed);
}

function buildSetChipText(set: WorkoutExerciseSet): string {
    const parts: string[] = [];

    if (
        typeof set.reps === "number" &&
        Number.isFinite(set.reps) &&
        typeof set.weight === "number" &&
        Number.isFinite(set.weight)
    ) {
        parts.push(`${Math.trunc(set.reps)} x ${set.weight}${set.unit}`);
    } else if (typeof set.reps === "number" && Number.isFinite(set.reps)) {
        parts.push(`${Math.trunc(set.reps)} reps`);
    } else if (typeof set.weight === "number" && Number.isFinite(set.weight)) {
        parts.push(`${set.weight}${set.unit}`);
    }

    if (typeof set.rpe === "number" && Number.isFinite(set.rpe)) {
        parts.push(`RPE ${set.rpe}`);
    }

    return parts.length > 0 ? parts.join(" • ") : "Sin datos";
}

export function GymCheckPerformedSetEditor({
    index,
    set,
    unit,
    busy,
    canRemove,
    onCommit,
    onRemove,
}: Props) {
    const { colors } = useTheme();

    const [repsText, setRepsText] = React.useState<string>(
        set.reps === null || set.reps === undefined ? "" : String(set.reps)
    );
    const [weightText, setWeightText] = React.useState<string>(
        set.weight === null || set.weight === undefined ? "" : String(set.weight)
    );
    const [rpeText, setRpeText] = React.useState<string>(
        set.rpe === null || set.rpe === undefined ? "" : String(set.rpe)
    );

    const [isEditingReps, setIsEditingReps] = React.useState(false);
    const [isEditingWeight, setIsEditingWeight] = React.useState(false);
    const [isEditingRpe, setIsEditingRpe] = React.useState(false);

    React.useEffect(() => {
        if (!isEditingReps) {
            const next = set.reps === null || set.reps === undefined ? "" : String(set.reps);
            setRepsText(next);
        }
    }, [set.reps, isEditingReps]);

    React.useEffect(() => {
        if (!isEditingWeight) {
            const next = set.weight === null || set.weight === undefined ? "" : String(set.weight);
            setWeightText(next);
        }
    }, [set.weight, isEditingWeight]);

    React.useEffect(() => {
        if (!isEditingRpe) {
            const next = set.rpe === null || set.rpe === undefined ? "" : String(set.rpe);
            setRpeText(next);
        }
    }, [set.rpe, isEditingRpe]);

    function commitReps() {
        onCommit({ reps: parseIntInput(repsText) });
    }

    function commitWeight() {
        onCommit({
            weight: parseNumberInput(weightText),
            unit,
        });
    }

    function commitRpe() {
        onCommit({ rpe: parseNumberInput(rpeText) });
    }

    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                padding: 10,
                gap: 10,
                backgroundColor: busy ? colors.background : colors.surface,
                opacity: busy ? 0.8 : 1,
            }}
        >
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                }}
            >
                <Text style={{ color: colors.text, fontWeight: "900" }}>
                    Set {index + 1}
                </Text>

                <Pressable
                    onPress={busy ? undefined : onRemove}
                    disabled={busy || !canRemove}
                    style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                        opacity: busy || !canRemove ? 0.5 : 1,
                    }}
                >
                    <Text style={{ color: colors.text, fontWeight: "900" }}>Quitar</Text>
                </Pressable>
            </View>

            <Text
                style={{
                    color: colors.mutedText,
                    fontSize: 12,
                    fontWeight: "700",
                }}
            >
                {buildSetChipText(set)}
            </Text>

            <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1, gap: 6 }}>
                    <Text style={{ color: colors.mutedText, fontWeight: "800" }}>Reps</Text>
                    <TextInput
                        value={repsText}
                        onChangeText={setRepsText}
                        onFocus={() => setIsEditingReps(true)}
                        onBlur={() => {
                            setIsEditingReps(false);
                            commitReps();
                        }}
                        editable={!busy}
                        keyboardType="numeric"
                        placeholder="Ej. 5"
                        placeholderTextColor={colors.mutedText}
                        style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 10,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            color: colors.text,
                            backgroundColor: busy ? colors.surface : colors.background,
                            opacity: busy ? 0.7 : 1,
                        }}
                    />
                </View>

                <View style={{ flex: 1, gap: 6 }}>
                    <Text style={{ color: colors.mutedText, fontWeight: "800" }}>
                        Carga ({unit})
                    </Text>
                    <TextInput
                        value={weightText}
                        onChangeText={setWeightText}
                        onFocus={() => setIsEditingWeight(true)}
                        onBlur={() => {
                            setIsEditingWeight(false);
                            commitWeight();
                        }}
                        editable={!busy}
                        keyboardType="numeric"
                        placeholder={`Ej. ${unit === "kg" ? "80" : "185"}`}
                        placeholderTextColor={colors.mutedText}
                        style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 10,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            color: colors.text,
                            backgroundColor: busy ? colors.surface : colors.background,
                            opacity: busy ? 0.7 : 1,
                        }}
                    />
                </View>

                <View style={{ flex: 1, gap: 6 }}>
                    <Text style={{ color: colors.mutedText, fontWeight: "800" }}>RPE</Text>
                    <TextInput
                        value={rpeText}
                        onChangeText={setRpeText}
                        onFocus={() => setIsEditingRpe(true)}
                        onBlur={() => {
                            setIsEditingRpe(false);
                            commitRpe();
                        }}
                        editable={!busy}
                        keyboardType="numeric"
                        placeholder="Ej. 8"
                        placeholderTextColor={colors.mutedText}
                        style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 10,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            color: colors.text,
                            backgroundColor: busy ? colors.surface : colors.background,
                            opacity: busy ? 0.7 : 1,
                        }}
                    />
                </View>
            </View>
        </View>
    );
}