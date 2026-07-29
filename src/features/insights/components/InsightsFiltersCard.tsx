// src/features/insights/components/InsightsFiltersCard.tsx
// Shared filters for streaks plus the PR/recovery date range.

import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import type { StreaksMode } from "@/src/services/workout/insights.service";
import { useTheme } from "@/src/theme/ThemeProvider";

import { InsightsDatePickerField } from "./InsightsDatePickerField";

type ModeOption = {
    value: StreaksMode;
    label: string;
};

const MODE_OPTIONS: ModeOption[] = [
    { value: "training", label: "Entrenamiento" },
    { value: "sleep", label: "Sueño" },
    { value: "both", label: "Ambos" },
];

type InsightsFiltersCardProps = {
    mode: StreaksMode;
    onModeChange: (next: StreaksMode) => void;
    gapDaysText: string;
    onGapDaysTextChange: (next: string) => void;
    asOf: string;
    onAsOfChange: (next: string) => void;
    from: string;
    onFromChange: (next: string) => void;
    to: string;
    onToChange: (next: string) => void;
    rangeValidationMessage: string | null;
};

export function InsightsFiltersCard({
    mode,
    onModeChange,
    gapDaysText,
    onGapDaysTextChange,
    asOf,
    onAsOfChange,
    from,
    onFromChange,
    to,
    onToChange,
    rangeValidationMessage,
}: InsightsFiltersCardProps) {
    const { colors } = useTheme();

    return (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Filtros</Text>
            <Text style={[styles.subtitle, { color: colors.mutedText }]}>
                Rachas usa un día límite; PRs y recuperación comparten el mismo rango.
            </Text>

            <View style={styles.sections}>
                <View style={[styles.filterSection, { borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Rachas</Text>
                    <Text style={[styles.sectionSubtitle, { color: colors.mutedText }]}>
                        Calcula continuidad de entrenamiento, sueño o ambos.
                    </Text>

                    <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>Modo</Text>
                    <View style={[styles.modeControl, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        {MODE_OPTIONS.map((option) => {
                            const selected = option.value === mode;

                            return (
                                <Pressable
                                    key={option.value}
                                    accessibilityRole="button"
                                    accessibilityState={{ selected }}
                                    onPress={() => onModeChange(option.value)}
                                    style={({ pressed }) => [
                                        styles.modeButton,
                                        {
                                            backgroundColor: selected ? colors.primary : "transparent",
                                            opacity: pressed ? 0.84 : 1,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.modeButtonText,
                                            { color: selected ? colors.primaryText : colors.text },
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {option.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    <View style={styles.streakFieldsRow}>
                        <View style={styles.gapField}>
                            <Text style={[styles.fieldLabel, { color: colors.mutedText }]}>Días de margen</Text>
                            <TextInput
                                value={gapDaysText}
                                onChangeText={(value) => onGapDaysTextChange(value.replace(/[^\d]/g, ""))}
                                keyboardType="number-pad"
                                placeholder="0"
                                placeholderTextColor={colors.mutedText}
                                style={[
                                    styles.textInput,
                                    {
                                        backgroundColor: colors.background,
                                        borderColor: colors.border,
                                        color: colors.text,
                                    },
                                ]}
                            />
                        </View>

                        <InsightsDatePickerField
                            label="Calcular hasta"
                            value={asOf}
                            onChange={onAsOfChange}
                        />
                    </View>
                </View>

                <View style={[styles.filterSection, { borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>PRs y recuperación</Text>
                    <Text style={[styles.sectionSubtitle, { color: colors.mutedText }]}>
                        Analiza récords personales y recuperación dentro del rango.
                    </Text>

                    <View style={styles.rangeFieldsRow}>
                        <InsightsDatePickerField label="Desde" value={from} onChange={onFromChange} />
                        <InsightsDatePickerField label="Hasta" value={to} onChange={onToChange} />
                    </View>

                    {rangeValidationMessage ? (
                        <Text style={[styles.validationMessage, { color: colors.danger }]}>
                            {rangeValidationMessage}
                        </Text>
                    ) : null}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderWidth: 1,
        borderRadius: 18,
        padding: 14,
        gap: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: "900",
    },
    subtitle: {
        fontSize: 13,
        fontWeight: "700",
        lineHeight: 19,
    },
    sections: {
        marginTop: 10,
        gap: 12,
    },
    filterSection: {
        borderWidth: 1,
        borderRadius: 15,
        padding: 12,
        gap: 9,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: "900",
    },
    sectionSubtitle: {
        marginTop: -5,
        fontSize: 12,
        fontWeight: "700",
        lineHeight: 17,
    },
    fieldLabel: {
        fontSize: 11,
        fontWeight: "800",
    },
    modeControl: {
        flexDirection: "row",
        borderWidth: 1,
        borderRadius: 13,
        padding: 4,
        gap: 4,
    },
    modeButton: {
        flex: 1,
        minHeight: 38,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 5,
    },
    modeButtonText: {
        fontSize: 11,
        fontWeight: "900",
    },
    streakFieldsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        alignItems: "flex-end",
    },
    gapField: {
        flex: 0.7,
        minWidth: 115,
        gap: 6,
    },
    textInput: {
        minHeight: 44,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        fontSize: 13,
        fontWeight: "800",
        textAlign: "center",
    },
    rangeFieldsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    validationMessage: {
        fontSize: 12,
        fontWeight: "800",
        lineHeight: 17,
    },
});
