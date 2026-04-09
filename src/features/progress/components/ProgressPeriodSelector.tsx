// src/features/progress/components/ProgressPeriodSelector.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type {
    WorkoutProgressCompareTo,
    WorkoutProgressMode,
} from "@/src/types/workoutProgress.types";

type ProgressPeriodSelectorProps = {
    mode: WorkoutProgressMode;
    compareTo: WorkoutProgressCompareTo;
    customRangeLabel?: string | null;
    onChangeMode: (value: WorkoutProgressMode) => void;
    onChangeCompareTo: (value: WorkoutProgressCompareTo) => void;
    onOpenCustomRange?: () => void;
};

const MODE_OPTIONS: Array<{ value: WorkoutProgressMode; label: string }> = [
    { value: "last7", label: "7 días" },
    { value: "last30", label: "30 días" },
    { value: "currentMonth", label: "Mes actual" },
    { value: "customRange", label: "Personalizado" },
];

const COMPARE_OPTIONS: Array<{ value: WorkoutProgressCompareTo; label: string }> = [
    { value: "previous_period", label: "Periodo previo" },
    { value: "previous_month", label: "Mes previo" },
    { value: "none", label: "Sin comparar" },
];

export function ProgressPeriodSelector({
    mode,
    compareTo,
    customRangeLabel = null,
    onChangeMode,
    onChangeCompareTo,
    onOpenCustomRange,
}: ProgressPeriodSelectorProps) {
    const { colors } = useTheme();

    const handleModePress = React.useCallback(
        (value: WorkoutProgressMode) => {
            onChangeMode(value);

            if (value === "customRange") {
                onOpenCustomRange?.();
            }
        },
        [onChangeMode, onOpenCustomRange]
    );

    return (
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <View style={{ gap: 6 }}>
                <Text style={[styles.label, { color: colors.text }]}>Periodo</Text>
                <View style={styles.rowWrap}>
                    {MODE_OPTIONS.map((option) => {
                        const active = option.value === mode;

                        return (
                            <Pressable
                                key={option.value}
                                onPress={() => handleModePress(option.value)}
                                style={({ pressed }) => [
                                    styles.chip,
                                    {
                                        borderColor: active ? colors.primary : colors.border,
                                        backgroundColor: active ? colors.primary : colors.background,
                                        opacity: pressed ? 0.92 : 1,
                                    },
                                ]}
                            >
                                <Text
                                    style={{
                                        color: active ? colors.primaryText : colors.text,
                                        fontWeight: "800",
                                        fontSize: 12,
                                    }}
                                >
                                    {option.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                {mode === "customRange" && customRangeLabel ? (
                    <Text style={{ color: colors.mutedText, fontWeight: "700", fontSize: 12 }}>
                        {customRangeLabel}
                    </Text>
                ) : null}
            </View>

            <View style={{ gap: 6 }}>
                <Text style={[styles.label, { color: colors.text }]}>Comparar con</Text>
                <View style={styles.rowWrap}>
                    {COMPARE_OPTIONS.map((option) => {
                        const active = option.value === compareTo;

                        return (
                            <Pressable
                                key={option.value}
                                onPress={() => onChangeCompareTo(option.value)}
                                style={({ pressed }) => [
                                    styles.chip,
                                    {
                                        borderColor: active ? colors.primary : colors.border,
                                        backgroundColor: active ? colors.primary : colors.background,
                                        opacity: pressed ? 0.92 : 1,
                                    },
                                ]}
                            >
                                <Text
                                    style={{
                                        color: active ? colors.primaryText : colors.text,
                                        fontWeight: "800",
                                        fontSize: 12,
                                    }}
                                >
                                    {option.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 12,
        gap: 12,
    },
    label: {
        fontSize: 13,
        fontWeight: "800",
    },
    rowWrap: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    chip: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 9,
    },
});