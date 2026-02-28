// src/features/routines/components/RoutineDayEditor.tsx
import React from "react";
import { Text, TextInput, View } from "react-native";
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
    return (
        <View style={{ gap: 6 }}>
            <Text style={{ fontWeight: "800" }}>{props.label}</Text>
            <TextInput
                value={props.value}
                onChangeText={props.onChange}
                placeholder={props.placeholder}
                multiline={props.multiline}
                style={{
                    borderWidth: 1,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    minHeight: props.multiline ? 84 : undefined,
                    textAlignVertical: props.multiline ? "top" : "center",
                }}
            />
        </View>
    );
}

export function RoutineDayEditor({ dayKey, date, value, onChange }: Props) {
    return (
        <View style={{ gap: 12 }}>
            <Text style={{ color: "#6B7280" }}>
                Día: <Text style={{ fontFamily: "Menlo" }}>{dayKey}</Text> · Fecha:{" "}
                <Text style={{ fontFamily: "Menlo" }}>{date}</Text>
            </Text>

            <Field
                label="Tipo de sesión"
                value={value.sessionType}
                onChange={(v) => onChange({ sessionType: v })}
                placeholder="Ej. Pull Power"
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