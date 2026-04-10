// src/features/progress/components/ExerciseProgressFilterBar.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { WorkoutExerciseComparisonBasis } from "@/src/types/workoutProgress.types";
import { formatExerciseBasisLabel } from "./progressFormatters";

type ExerciseProgressFilterValue = WorkoutExerciseComparisonBasis | "all";

type ExerciseProgressFilterBarProps = {
    value: ExerciseProgressFilterValue;
    onChange: (value: ExerciseProgressFilterValue) => void;
};

const OPTIONS: ExerciseProgressFilterValue[] = [
    "all",
    "topSetLoad",
    "volumeLoad",
    "bestRepsAtSameLoad",
    "estimatedStrength",
];

export function ExerciseProgressFilterBar({
    value,
    onChange,
}: ExerciseProgressFilterBarProps) {
    const { colors } = useTheme();

    return (
        <View style={styles.wrap}>
            {OPTIONS.map((option) => {
                const active = value === option;
                const label = option === "all" ? "Todo" : formatExerciseBasisLabel(option);

                return (
                    <Pressable
                        key={option}
                        onPress={() => onChange(option)}
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
                            {label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    chip: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
});