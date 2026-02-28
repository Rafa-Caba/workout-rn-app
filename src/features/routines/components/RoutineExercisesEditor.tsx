// src/features/routines/components/RoutineExercisesEditor.tsx
import { RNFile } from "@/src/types/upload.types";
import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { AttachmentOption } from "../../../utils/routines/attachments";
import { ExerciseAttachmentPickerRN } from "./ExerciseAttachmentPickerRN";
import { MovementPickerInline, type MovementOption } from "./MovementPickerInline";

export type RoutineExerciseDraft = {
    id: string;

    name: string;

    movementId: string | null;
    movementName: string | null;

    sets: string;
    reps: string;
    rpe: string;
    load: string;
    notes: string;

    attachmentPublicIds: string[];
    pendingFiles: RNFile[];
};

type Props = {
    movements: MovementOption[];

    // week-level attachments catalog
    attachmentOptions: AttachmentOption[];

    value: RoutineExerciseDraft[];
    onChange: (next: RoutineExerciseDraft[]) => void;
};

function Button(props: { title: string; onPress: () => void; tone?: "primary" | "danger" | "neutral"; disabled?: boolean }) {
    const accent = "#2563EB";
    const danger = "#EF4444";
    const tone = props.tone ?? "neutral";
    const borderColor = tone === "primary" ? accent : tone === "danger" ? danger : "#111827";
    const bgColor = tone === "primary" ? accent : "transparent";
    const color = tone === "primary" ? "#FFFFFF" : tone === "danger" ? danger : "#111827";

    return (
        <Pressable
            onPress={props.onPress}
            disabled={props.disabled}
            style={{
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor,
                backgroundColor: bgColor,
                opacity: props.disabled ? 0.5 : 1,
            }}
        >
            <Text style={{ fontWeight: "900", color }}>{props.title}</Text>
        </Pressable>
    );
}

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

function makeId(): string {
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function makeNewExercise(): RoutineExerciseDraft {
    return {
        id: makeId(),
        name: "",
        movementId: null,
        movementName: null,
        sets: "",
        reps: "",
        rpe: "",
        load: "",
        notes: "",
        attachmentPublicIds: [],
        pendingFiles: [],
    };
}

export function RoutineExercisesEditor({ movements, attachmentOptions, value, onChange }: Props) {
    const add = () => {
        onChange([...(value ?? []), makeNewExercise()]);
    };

    const remove = (id: string) => {
        onChange((value ?? []).filter((x) => x.id !== id));
    };

    const patch = (id: string, p: Partial<RoutineExerciseDraft>) => {
        onChange((value ?? []).map((x) => (x.id === id ? { ...x, ...p } : x)));
    };

    const appendPending = (id: string, files: RNFile[]) => {
        const cur = (value ?? []).find((x) => x.id === id);
        const next = [...(cur?.pendingFiles ?? []), ...(files ?? [])];
        patch(id, { pendingFiles: next });
    };

    const removePending = (id: string, index?: number) => {
        const cur = (value ?? []).find((x) => x.id === id);
        const list = [...(cur?.pendingFiles ?? [])];
        if (index === undefined) {
            patch(id, { pendingFiles: [] });
            return;
        }
        list.splice(index, 1);
        patch(id, { pendingFiles: list });
    };

    const removeLinked = (id: string, publicId: string) => {
        const cur = (value ?? []).find((x) => x.id === id);
        const ids = (cur?.attachmentPublicIds ?? []).filter((x) => x !== publicId);
        patch(id, { attachmentPublicIds: ids });
    };

    return (
        <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 16, fontWeight: "900" }}>Ejercicios del día</Text>
                <Button title="Añadir ejercicio" onPress={add} tone="primary" />
            </View>

            {(value ?? []).length === 0 ? <Text style={{ color: "#6B7280" }}>No hay ejercicios todavía.</Text> : null}

            {(value ?? []).map((ex, idx) => (
                <View key={ex.id} style={{ borderWidth: 1, borderRadius: 14, padding: 12, gap: 12 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                        <Text style={{ fontWeight: "900" }}>Ejercicio #{idx + 1}</Text>
                        <Button title="Eliminar" onPress={() => remove(ex.id)} tone="danger" />
                    </View>

                    <MovementPickerInline
                        movements={movements}
                        value={{ movementId: ex.movementId, movementName: ex.movementName }}
                        onChange={(m) => patch(ex.id, { movementId: m.movementId, movementName: m.movementName })}
                    />

                    <Field label="Nombre" value={ex.name} onChange={(v) => patch(ex.id, { name: v })} placeholder="Ej. Bench press" />

                    <View style={{ flexDirection: "row", gap: 10 }}>
                        <View style={{ flex: 1 }}>
                            <Field label="Series" value={ex.sets} onChange={(v) => patch(ex.id, { sets: v })} placeholder="4" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Field label="Reps" value={ex.reps} onChange={(v) => patch(ex.id, { reps: v })} placeholder="8-10" />
                        </View>
                    </View>

                    <View style={{ flexDirection: "row", gap: 10 }}>
                        <View style={{ flex: 1 }}>
                            <Field label="RPE (planeado)" value={ex.rpe} onChange={(v) => patch(ex.id, { rpe: v })} placeholder="7" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Field label="Carga" value={ex.load} onChange={(v) => patch(ex.id, { load: v })} placeholder="75 lb" />
                        </View>
                    </View>

                    <Field label="Notas" value={ex.notes} onChange={(v) => patch(ex.id, { notes: v })} placeholder="Notas..." multiline />

                    <ExerciseAttachmentPickerRN
                        title="Adjuntos"
                        hint="Fotos o videos del ejercicio (se suben hasta que guardes)."
                        emptyText="Sin adjuntos enlazados."
                        uploadAndAttachLabel="Añadir"
                        attachmentOptions={attachmentOptions}
                        selectedIds={ex.attachmentPublicIds ?? []}
                        pendingFiles={ex.pendingFiles ?? []}
                        onPickFiles={(files) => appendPending(ex.id, files)}
                        onRemovePending={(i) => removePending(ex.id, i)}
                        onRemoveLinked={(publicId) => removeLinked(ex.id, publicId)}
                    />
                </View>
            ))}
        </View>
    );
}