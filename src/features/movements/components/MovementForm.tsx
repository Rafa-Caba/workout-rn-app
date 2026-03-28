// /src/features/movements/components/MovementForm.tsx
import React from "react";
import { ActivityIndicator, Image, Pressable, Switch, Text, TextInput, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { RNFile } from "@/src/types/upload.types";

import type { MovementFormState } from "./movementFormData";
import { EquipmentSelectRN, MuscleGroupSelectRN } from "./MovementSelects";
import { pickMovementImage } from "./pickMovementImage";

type Props = {
    title?: string;
    submitLabel: string;
    value: MovementFormState;
    onChange: (next: MovementFormState) => void;
    onSubmit: () => void;
    busy?: boolean;
    disabled?: boolean;
};

export function MovementForm({
    title,
    submitLabel,
    value,
    onChange,
    onSubmit,
    busy,
    disabled,
}: Props) {
    const { colors } = useTheme();

    const canSubmit = Boolean(value.name.trim()) && !busy && !disabled;

    async function onPickImage() {
        if (disabled || busy) {
            return;
        }

        const file = await pickMovementImage();
        if (!file) {
            return;
        }

        onChange({ ...value, image: file });
    }

    function onClearImage() {
        if (disabled || busy) {
            return;
        }

        onChange({ ...value, image: null });
    }

    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 12,
                gap: 10,
            }}
        >
            {title ? <Text style={{ fontWeight: "900", color: colors.text }}>{title}</Text> : null}

            <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: colors.mutedText }}>Nombre</Text>
                <TextInput
                    value={value.name}
                    onChangeText={(text) => onChange({ ...value, name: text })}
                    placeholder="Nombre (requerido)"
                    placeholderTextColor={colors.mutedText}
                    editable={!disabled && !busy}
                    style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                        color: colors.text,
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        fontWeight: "700",
                    }}
                />
            </View>

            <View style={{ flexDirection: "column", gap: 10, marginBottom: 5 }}>
                <View style={{ flex: 1, gap: 6 }}>
                    <MuscleGroupSelectRN
                        value={value.muscleGroup}
                        onChange={(next) => onChange({ ...value, muscleGroup: next })}
                        placeholder="Selecciona grupos..."
                        allowOther
                        otherLabel="Agregar otro grupo"
                        otherPlaceholder="Escribe el grupo"
                        otherHint="Puedes seleccionar varios grupos musculares."
                        disabled={disabled || busy}
                    />
                </View>

                <View style={{ flex: 1, gap: 6 }}>
                    <EquipmentSelectRN
                        value={value.equipment}
                        onChange={(next) => onChange({ ...value, equipment: next })}
                        placeholder="Selecciona equipos..."
                        allowOther
                        otherLabel="Agregar otro equipo"
                        otherPlaceholder="Escribe el equipo"
                        otherHint="Puedes seleccionar varios equipos."
                        disabled={disabled || busy}
                    />
                </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                    onPress={onPickImage}
                    style={({ pressed }) => ({
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                        opacity: pressed ? 0.92 : 1,
                    })}
                >
                    <Text style={{ color: colors.text, fontWeight: "800" }}>Elegir imagen</Text>
                </Pressable>

                {value.image ? (
                    <Pressable
                        onPress={onClearImage}
                        style={({ pressed }) => ({
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                            opacity: pressed ? 0.92 : 1,
                        })}
                    >
                        <Text style={{ color: colors.mutedText, fontWeight: "800" }}>Quitar</Text>
                    </Pressable>
                ) : null}
            </View>

            {value.image ? <ImagePreview file={value.image} /> : null}

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Switch
                        value={value.isActive}
                        onValueChange={(next) => onChange({ ...value, isActive: next })}
                        disabled={disabled || busy}
                        trackColor={{ false: colors.border, true: colors.primary }}
                    />
                    <Text style={{ fontWeight: "800", color: colors.text }}>Activo</Text>
                </View>

                <Pressable
                    onPress={onSubmit}
                    disabled={!canSubmit}
                    style={({ pressed }) => ({
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 12,
                        backgroundColor: canSubmit ? colors.primary : colors.border,
                        opacity: pressed && canSubmit ? 0.92 : 1,
                        minWidth: 110,
                        alignItems: "center",
                        justifyContent: "center",
                    })}
                >
                    {busy ? (
                        <ActivityIndicator />
                    ) : (
                        <Text style={{ color: colors.primaryText, fontWeight: "900" }}>{submitLabel}</Text>
                    )}
                </Pressable>
            </View>
        </View>
    );
}

function ImagePreview({ file }: { file: RNFile }) {
    const { colors } = useTheme();

    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.background,
                borderRadius: 16,
                overflow: "hidden",
            }}
        >
            <Image source={{ uri: file.uri }} style={{ width: "100%", height: 150 }} />
            <Text
                style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    color: colors.mutedText,
                    fontWeight: "700",
                }}
                numberOfLines={1}
            >
                {file.name}
            </Text>
        </View>
    );
}