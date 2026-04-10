// src/features/bodyMetrics/components/BodyMetricFormModal.tsx

import React from "react";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { DatePickerField } from "@/src/features/components/DatePickerField";
import { useTheme } from "@/src/theme/ThemeProvider";
import type {
    UpsertUserMetricRequest,
    UserMetricEntry,
} from "@/src/types/bodyMetrics.types";

type Props = {
    visible: boolean;
    initialEntry: UserMetricEntry | null;
    onClose: () => void;
    onSave: (args: { date: string; payload: UpsertUserMetricRequest }) => Promise<void>;
    saving: boolean;
};

type FormState = {
    date: string;
    weightKg: string;
    bodyFatPct: string;
    waistCm: string;
    notes: string;
};

function getTodayIsoDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function toInitialForm(entry: UserMetricEntry | null): FormState {
    return {
        date: entry?.date ?? getTodayIsoDate(),
        weightKg:
            typeof entry?.weightKg === "number" ? String(entry.weightKg) : "",
        bodyFatPct:
            typeof entry?.bodyFatPct === "number" ? String(entry.bodyFatPct) : "",
        waistCm:
            typeof entry?.waistCm === "number" ? String(entry.waistCm) : "",
        notes: entry?.notes ?? "",
    };
}

function parseNullableNumber(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
}

function isFormMeaningful(payload: UpsertUserMetricRequest): boolean {
    return (
        payload.weightKg !== null ||
        payload.bodyFatPct !== null ||
        payload.waistCm !== null ||
        (typeof payload.notes === "string" && payload.notes.trim().length > 0)
    );
}

function Field(props: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    keyboardType?: "default" | "numeric";
    multiline?: boolean;
}) {
    const { colors } = useTheme();

    return (
        <View style={{ gap: 6 }}>
            <Text style={{ color: colors.mutedText, fontWeight: "800", fontSize: 12 }}>
                {props.label}
            </Text>

            <TextInput
                value={props.value}
                onChangeText={props.onChangeText}
                placeholder={props.placeholder}
                placeholderTextColor={colors.mutedText}
                keyboardType={props.keyboardType ?? "default"}
                multiline={props.multiline}
                style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: props.multiline ? 12 : 10,
                    minHeight: props.multiline ? 96 : undefined,
                    backgroundColor: colors.background,
                    color: colors.text,
                    textAlignVertical: props.multiline ? "top" : "center",
                }}
            />
        </View>
    );
}

export function BodyMetricFormModal({
    visible,
    initialEntry,
    onClose,
    onSave,
    saving,
}: Props) {
    const { colors } = useTheme();

    const [form, setForm] = React.useState<FormState>(() => toInitialForm(initialEntry));

    React.useEffect(() => {
        if (!visible) return;
        setForm(toInitialForm(initialEntry));
    }, [initialEntry, visible]);

    const handleSave = async () => {
        const payload: UpsertUserMetricRequest = {
            weightKg: parseNullableNumber(form.weightKg),
            bodyFatPct: parseNullableNumber(form.bodyFatPct),
            waistCm: parseNullableNumber(form.waistCm),
            notes: form.notes.trim().length ? form.notes.trim() : null,
            source: initialEntry?.source ?? "manual",
        };

        if (!isFormMeaningful(payload)) {
            Alert.alert(
                "Registro vacío",
                "Agrega al menos peso, grasa corporal, cintura o una nota."
            );
            return;
        }

        try {
            await onSave({
                date: form.date,
                payload,
            });
        } catch {
            // handled in parent if needed
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View
                style={{
                    flex: 1,
                    backgroundColor: "rgba(0,0,0,0.45)",
                    padding: 16,
                    justifyContent: "center",
                }}
            >
                <View
                    style={{
                        maxHeight: "90%",
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 18,
                        backgroundColor: colors.surface,
                        overflow: "hidden",
                    }}
                >
                    <ScrollView
                        contentContainerStyle={{
                            padding: 16,
                            gap: 14,
                        }}
                    >
                        <View style={{ gap: 4 }}>
                            <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}>
                                {initialEntry ? "Editar registro corporal" : "Nuevo registro corporal"}
                            </Text>
                            <Text style={{ color: colors.mutedText }}>
                                Guarda peso, cintura, grasa corporal y notas del día.
                            </Text>
                        </View>

                        <DatePickerField
                            label="Fecha"
                            value={form.date}
                            onChange={(next) => setForm((prev) => ({ ...prev, date: next }))}
                        />

                        <Field
                            label="Peso (kg)"
                            value={form.weightKg}
                            onChangeText={(text) => setForm((prev) => ({ ...prev, weightKg: text }))}
                            placeholder="Ej. 78.4"
                            keyboardType="numeric"
                        />

                        <Field
                            label="Grasa corporal (%)"
                            value={form.bodyFatPct}
                            onChangeText={(text) => setForm((prev) => ({ ...prev, bodyFatPct: text }))}
                            placeholder="Ej. 18.2"
                            keyboardType="numeric"
                        />

                        <Field
                            label="Cintura (cm)"
                            value={form.waistCm}
                            onChangeText={(text) => setForm((prev) => ({ ...prev, waistCm: text }))}
                            placeholder="Ej. 84.5"
                            keyboardType="numeric"
                        />

                        <Field
                            label="Notas"
                            value={form.notes}
                            onChangeText={(text) => setForm((prev) => ({ ...prev, notes: text }))}
                            placeholder="Cómo te sentiste, contexto, observaciones..."
                            multiline
                        />

                        <View style={{ flexDirection: "row", gap: 10 }}>
                            <Pressable
                                onPress={onClose}
                                disabled={saving}
                                style={({ pressed }) => ({
                                    flex: 1,
                                    paddingVertical: 12,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    backgroundColor: colors.background,
                                    alignItems: "center",
                                    opacity: pressed || saving ? 0.9 : 1,
                                })}
                            >
                                <Text style={{ color: colors.text, fontWeight: "800" }}>
                                    Cancelar
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={() => void handleSave()}
                                disabled={saving}
                                style={({ pressed }) => ({
                                    flex: 1,
                                    paddingVertical: 12,
                                    borderRadius: 12,
                                    backgroundColor: colors.primary,
                                    alignItems: "center",
                                    opacity: pressed || saving ? 0.9 : 1,
                                })}
                            >
                                <Text style={{ color: colors.primaryText, fontWeight: "800" }}>
                                    {saving ? "Guardando..." : "Guardar"}
                                </Text>
                            </Pressable>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}