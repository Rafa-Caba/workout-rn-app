// src/features/healthBackfill/components/HealthBackfillModeSwitch.tsx
// Theme-aware mode switch for merge vs replace backfill behavior.

import type { UpsertMode } from "@/src/types/workoutDay.types";
import * as React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
    value: UpsertMode;
    onChange: (next: UpsertMode) => void;
    colors: ThemeColors;
};

export function HealthBackfillModeSwitch({ value, onChange, colors }: Props) {
    return (
        <View style={styles.wrapper}>
            <Text style={[styles.label, { color: colors.text }]}>Modo</Text>

            <View style={styles.row}>
                <Pressable
                    onPress={() => onChange("merge")}
                    style={({ pressed }) => [
                        styles.option,
                        {
                            borderColor: value === "merge" ? colors.primary : colors.border,
                            backgroundColor: value === "merge" ? colors.primary : colors.surface,
                            opacity: pressed ? 0.82 : 1,
                            transform: [{ scale: pressed ? 0.985 : 1 }],
                        },
                    ]}
                >
                    <Text
                        style={[
                            styles.optionText,
                            {
                                color:
                                    value === "merge" ? colors.primaryText : colors.text,
                            },
                        ]}
                    >
                        Merge
                    </Text>
                </Pressable>

                <Pressable
                    onPress={() => onChange("replace")}
                    style={({ pressed }) => [
                        styles.option,
                        {
                            borderColor: value === "replace" ? colors.primary : colors.border,
                            backgroundColor: value === "replace" ? colors.primary : colors.surface,
                            opacity: pressed ? 0.82 : 1,
                            transform: [{ scale: pressed ? 0.985 : 1 }],
                        },
                    ]}
                >
                    <Text
                        style={[
                            styles.optionText,
                            {
                                color:
                                    value === "replace" ? colors.primaryText : colors.text,
                            },
                        ]}
                    >
                        Replace
                    </Text>
                </Pressable>
            </View>

            <Text style={[styles.help, { color: colors.mutedText }]}>
                Merge es el modo recomendado. Replace sobrescribe el bloque del día con más agresividad.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: "800",
    },
    row: {
        flexDirection: "row",
        gap: 10,
    },
    option: {
        flex: 1,
        minHeight: 50,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    optionText: {
        fontSize: 15,
        fontWeight: "900",
    },
    help: {
        fontSize: 12,
        lineHeight: 18,
    },
});