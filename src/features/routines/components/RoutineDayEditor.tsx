// src/features/routines/components/RoutineDayEditor.tsx

import React from "react";
import { Text, TextInput, View } from "react-native";

import { SessionTypeSelector } from "@/src/features/components";
import { useTheme } from "@/src/theme/ThemeProvider";

import type { DayKey } from "../../../types/workoutRoutine.types";

type Draft = {
    sessionType: string;
    focus: string;
    tagsCsv: string;
    notes: string;
};

type Props = {
    dayKey: DayKey;
    date: string;
    value: Draft;
    onChange: (patch: Partial<Draft>) => void;
};

function Field(props: {
    label: string;
    value: string;
    placeholder?: string;
    onChange: (v: string) => void;
    multiline?: boolean;
}) {
    const { colors } = useTheme();

    return (
        <View style={{ gap: 6 }}>
            <Text style={{ fontWeight: "800", color: colors.text }}>{props.label}</Text>
            <TextInput
                value={props.value}
                onChangeText={props.onChange}
                placeholder={props.placeholder}
                placeholderTextColor={colors.mutedText}
                multiline={props.multiline}
                style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    minHeight: props.multiline ? 84 : undefined,
                    textAlignVertical: props.multiline ? "top" : "center",
                    fontWeight: "700",
                }}
            />
        </View>
    );
}

export function RoutineDayEditor({ dayKey, date, value, onChange }: Props) {
    const { colors } = useTheme();

    return (
        <View style={{ gap: 12 }}>
            <Text style={{ color: colors.mutedText }}>
                Día: <Text style={{ fontFamily: "Menlo", color: colors.text }}>{dayKey}</Text> · Fecha:{" "}
                <Text style={{ fontFamily: "Menlo", color: colors.text }}>{date}</Text>
            </Text>

            <SessionTypeSelector
                value={value.sessionType}
                onChange={(nextValue) => onChange({ sessionType: nextValue })}
                helperText="Usa un tipo canónico para mejorar progreso, adherencia y comparaciones."
            />

            <Field
                label="Enfoque"
                value={value.focus}
                onChange={(v) => onChange({ focus: v })}
                placeholder="Ej. Espalda + bíceps"
            />

            <Field
                label="Tags (CSV)"
                value={value.tagsCsv}
                onChange={(v) => onChange({ tagsCsv: v })}
                placeholder="power, hypertrophy"
            />

            <Field
                label="Notas"
                value={value.notes}
                onChange={(v) => onChange({ notes: v })}
                placeholder="Notas del día..."
                multiline
            />
        </View>
    );
}