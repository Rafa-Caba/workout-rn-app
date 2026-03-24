// src/features/healthBackfill/components/HealthBackfillSingleDateSection.tsx
// Theme-aware single-date backfill section using the shared DatePickerField.

import * as React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { DatePickerField } from "@/src/features/components/DatePickerField";
import { HealthBackfillModeSwitch } from "@/src/features/healthBackfill/components/HealthBackfillModeSwitch";
import type { UpsertMode } from "@/src/types/workoutDay.types";

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
    date: string;
    mode: UpsertMode;
    isPending: boolean;
    onDateChange: (value: string) => void;
    onModeChange: (value: UpsertMode) => void;
    onSubmit: () => void;
    colors: ThemeColors;
};

export function HealthBackfillSingleDateSection({
    date,
    mode,
    isPending,
    onDateChange,
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
            <Text style={[styles.title, { color: colors.text }]}>Backfill por día</Text>
            <Text style={[styles.subtitle, { color: colors.mutedText }]}>
                Importa sueño y sesiones mínimas automáticas de una sola fecha.
            </Text>

            <DatePickerField
                label="Fecha"
                value={date}
                onChange={onDateChange}
                disabled={isPending}
                displayFormat="MMM dd, yyyy"
            />

            <HealthBackfillModeSwitch value={mode} onChange={onModeChange} colors={colors} />

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
                        Importar este día
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