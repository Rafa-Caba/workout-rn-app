// src/features/healthBackfill/components/HealthBackfillRangeSection.tsx
// Theme-aware range backfill section.

import { HealthBackfillModeSwitch } from "@/src/features/healthBackfill/components/HealthBackfillModeSwitch";
import type { UpsertMode } from "@/src/types/workoutDay.types";
import * as React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

type ThemeColors = {
    background: string;
    surface: string;
    border: string;
    text: string;
    mutedText: string;
    primary: string;
    primaryText: string;
};

type Props = {
    from: string;
    to: string;
    mode: UpsertMode;
    previewCount: number;
    isPending: boolean;
    onFromChange: (value: string) => void;
    onToChange: (value: string) => void;
    onModeChange: (value: UpsertMode) => void;
    onSubmit: () => void;
    colors: ThemeColors;
};

export function HealthBackfillRangeSection({
    from,
    to,
    mode,
    previewCount,
    isPending,
    onFromChange,
    onToChange,
    onModeChange,
    onSubmit,
    colors,
}: Props) {
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
            <Text style={[styles.title, { color: colors.text }]}>Backfill por rango</Text>
            <Text style={[styles.subtitle, { color: colors.mutedText }]}>
                Importa histórico de varios días. Ideal para semanas pasadas o bloques faltantes.
            </Text>

            <View style={styles.row}>
                <View style={styles.col}>
                    <Text style={[styles.label, { color: colors.text }]}>Desde</Text>
                    <TextInput
                        value={from}
                        onChangeText={onFromChange}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={colors.mutedText}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={[
                            styles.input,
                            {
                                borderColor: colors.border,
                                backgroundColor: colors.background,
                                color: colors.text,
                            },
                        ]}
                    />
                </View>

                <View style={styles.col}>
                    <Text style={[styles.label, { color: colors.text }]}>Hasta</Text>
                    <TextInput
                        value={to}
                        onChangeText={onToChange}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={colors.mutedText}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={[
                            styles.input,
                            {
                                borderColor: colors.border,
                                backgroundColor: colors.background,
                                color: colors.text,
                            },
                        ]}
                    />
                </View>
            </View>

            <HealthBackfillModeSwitch value={mode} onChange={onModeChange} colors={colors} />

            <View
                style={[
                    styles.previewBox,
                    {
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                    },
                ]}
            >
                <Text style={[styles.previewTitle, { color: colors.text }]}>Preview</Text>
                <Text style={[styles.previewText, { color: colors.mutedText }]}>
                    Días detectados en el rango:{" "}
                    <Text style={[styles.previewStrong, { color: colors.text }]}>
                        {previewCount}
                    </Text>
                </Text>
            </View>

            <Pressable
                style={({ pressed }) => [
                    styles.button,
                    {
                        backgroundColor: colors.primary,
                        opacity: isPending ? 0.65 : pressed ? 0.82 : 1,
                        transform: [{ scale: pressed ? 0.985 : 1 }],
                    },
                ]}
                disabled={isPending}
                onPress={onSubmit}
            >
                {isPending ? (
                    <ActivityIndicator color={colors.primaryText} />
                ) : (
                    <Text style={[styles.buttonText, { color: colors.primaryText }]}>
                        Importar rango
                    </Text>
                )}
            </Pressable>
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
    row: {
        flexDirection: "row",
        gap: 12,
    },
    col: {
        flex: 1,
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: "800",
    },
    input: {
        height: 52,
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 14,
        fontSize: 15,
        fontWeight: "700",
    },
    previewBox: {
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        gap: 4,
    },
    previewTitle: {
        fontSize: 13,
        fontWeight: "900",
    },
    previewText: {
        fontSize: 13,
    },
    previewStrong: {
        fontWeight: "900",
    },
    button: {
        minHeight: 52,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    buttonText: {
        fontSize: 15,
        fontWeight: "900",
    },
});