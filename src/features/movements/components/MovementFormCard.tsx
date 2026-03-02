// src/features/movements/components/MovementFormCard.tsx
import React from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { RNFile } from "@/src/types/upload.types";

// NOTE:
// If your select components live in a different path, adjust these imports.
import { EquipmentSelectRN } from "@/src/features/components/EquipmentSelectRN";
import { MuscleGroupSelectRN } from "@/src/features/components/MuscleGroupSelectRN";

import type { MovementFormState } from "./movementFormData";
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

export function MovementFormCard({ title, submitLabel, value, onChange, onSubmit, busy, disabled }: Props) {
    const theme = useTheme();
    const { colors } = theme;

    async function onPickImage() {
        if (disabled || busy) return;
        const f = await pickMovementImage();
        if (!f) return;
        onChange({ ...value, image: f });
    }

    function clearImage() {
        if (disabled || busy) return;
        onChange({ ...value, image: null });
    }

    const canSubmit = Boolean(value.name.trim()) && !busy && !disabled;

    return (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {title ? <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text> : null}

            <Text style={[styles.label, { color: colors.mutedText }]}>Nombre</Text>
            <TextInput
                value={value.name}
                onChangeText={(t) => onChange({ ...value, name: t })}
                placeholder="Nombre (requerido)"
                placeholderTextColor={colors.mutedText}
                editable={!disabled && !busy}
                style={[
                    styles.input,
                    {
                        borderColor: colors.border,
                        color: colors.text,
                        backgroundColor: colors.background,
                    },
                ]}
            />

            <View style={styles.row2}>
                <View style={styles.col}>
                    <Text style={[styles.label, { color: colors.mutedText }]}>Grupo muscular</Text>
                    <MuscleGroupSelectRN
                        value={value.muscleGroup}
                        onChange={(next) => onChange({ ...value, muscleGroup: next })}
                        label={undefined}
                        placeholder="Selecciona un grupo..."
                        disabled={disabled || busy}
                        allowOther
                        otherLabel="Otro"
                        otherPlaceholder="Escribe el grupo"
                        otherHint="Se guardará tal cual"
                    />
                </View>

                <View style={styles.col}>
                    <Text style={[styles.label, { color: colors.mutedText }]}>Equipo</Text>
                    <EquipmentSelectRN
                        value={value.equipment}
                        onChange={(next) => onChange({ ...value, equipment: next })}
                        label={undefined}
                        placeholder="Selecciona un equipo..."
                        disabled={disabled || busy}
                        allowOther
                        otherLabel="Otro"
                        otherPlaceholder="Escribe el equipo"
                        otherHint="Se guardará tal cual"
                    />
                </View>
            </View>

            <View style={styles.imageRow}>
                <Pressable
                    onPress={onPickImage}
                    style={({ pressed }) => [
                        styles.btn,
                        {
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                            opacity: pressed ? 0.9 : 1,
                        },
                    ]}
                >
                    <Text style={[styles.btnText, { color: colors.text }]}>Elegir imagen</Text>
                </Pressable>

                {value.image ? (
                    <Pressable
                        onPress={clearImage}
                        style={({ pressed }) => [
                            styles.btn,
                            {
                                borderColor: colors.border,
                                backgroundColor: colors.background,
                                opacity: pressed ? 0.9 : 1,
                            },
                        ]}
                    >
                        <Text style={[styles.btnText, { color: colors.mutedText }]}>Quitar</Text>
                    </Pressable>
                ) : null}
            </View>

            {value.image ? <ImagePreview file={value.image} /> : null}

            <View style={styles.bottomRow}>
                <View style={styles.switchRow}>
                    <Switch
                        value={value.isActive}
                        onValueChange={(next) => onChange({ ...value, isActive: next })}
                        disabled={disabled || busy}
                        thumbColor={undefined}
                        trackColor={{ false: colors.border, true: colors.primary }}
                    />
                    <Text style={[styles.switchLabel, { color: colors.text }]}>Activo</Text>
                </View>

                <Pressable
                    onPress={onSubmit}
                    disabled={!canSubmit}
                    style={({ pressed }) => [
                        styles.primaryBtn,
                        {
                            backgroundColor: canSubmit ? colors.primary : colors.border,
                            opacity: pressed && canSubmit ? 0.92 : 1,
                        },
                    ]}
                >
                    {busy ? <ActivityIndicator /> : <Text style={[styles.primaryBtnText, { color: colors.primaryText }]}>{submitLabel}</Text>}
                </Pressable>
            </View>
        </View>
    );
}

function ImagePreview({ file }: { file: RNFile }) {
    const theme = useTheme();
    const { colors } = theme;

    return (
        <View style={[styles.previewWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Image source={{ uri: file.uri }} style={styles.previewImg} />
            <Text numberOfLines={1} style={[styles.previewText, { color: colors.mutedText }]}>
                {file.name}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        gap: 10,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: "900",
        marginBottom: 2,
    },
    label: {
        fontSize: 12,
        fontWeight: "800",
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        fontWeight: "700",
    },
    row2: {
        flexDirection: "row",
        gap: 10,
    },
    col: {
        flex: 1,
        gap: 6,
    },
    imageRow: {
        flexDirection: "row",
        gap: 10,
    },
    btn: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    btnText: {
        fontSize: 13,
        fontWeight: "800",
    },
    previewWrap: {
        borderWidth: 1,
        borderRadius: 14,
        overflow: "hidden",
    },
    previewImg: {
        width: "100%",
        height: 140,
        resizeMode: "cover",
    },
    previewText: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 12,
        fontWeight: "700",
    },
    bottomRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        marginTop: 4,
    },
    switchRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    switchLabel: {
        fontSize: 14,
        fontWeight: "800",
    },
    primaryBtn: {
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        minWidth: 110,
        alignItems: "center",
        justifyContent: "center",
    },
    primaryBtnText: {
        fontSize: 14,
        fontWeight: "900",
    },
});