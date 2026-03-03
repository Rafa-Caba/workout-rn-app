// src/features/trainer/components/TrainerTabs.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

export type TrainerTab = "weekly" | "day" | "recovery" | "assign";

type Props = {
    value: TrainerTab;
    onChange: (next: TrainerTab) => void;
    disabled?: boolean;
};

export function TrainerTabs({ value, onChange, disabled }: Props) {
    const { colors } = useTheme();

    const wrapStyle = [
        styles.wrap,
        {
            borderColor: colors.border,
            backgroundColor: colors.background,
            opacity: disabled ? 0.6 : 1,
        },
    ];

    return (
        <View style={wrapStyle}>
            <View style={styles.row}>
                <TabButton
                    label="Resumen semanal"
                    active={value === "weekly"}
                    disabled={disabled}
                    onPress={() => onChange("weekly")}
                />
                <TabButton
                    label="Resumen del día"
                    active={value === "day"}
                    disabled={disabled}
                    onPress={() => onChange("day")}
                />
            </View>

            <View style={styles.row}>
                <TabButton
                    label="Recuperación"
                    active={value === "recovery"}
                    disabled={disabled}
                    onPress={() => onChange("recovery")}
                />
                <TabButton
                    label="Asignar rutina"
                    active={value === "assign"}
                    disabled={disabled}
                    onPress={() => onChange("assign")}
                />
            </View>
        </View>
    );

    function TabButton(args: { label: string; active: boolean; disabled?: boolean; onPress: () => void }) {
        const { label, active, disabled: isDisabled, onPress } = args;

        return (
            <Pressable
                onPress={() => !isDisabled && onPress()}
                style={({ pressed }) => [
                    styles.tab,
                    {
                        borderColor: colors.border,
                        backgroundColor: active ? colors.primary : "transparent",
                        opacity: pressed ? 0.92 : 1,
                    },
                ]}
            >
                <Text style={{ fontWeight: "900", color: active ? "#fff" : colors.text, fontSize: 12 }} numberOfLines={1}>
                    {label}
                </Text>
            </Pressable>
        );
    }
}

const styles = StyleSheet.create({
    wrap: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 6,
        gap: 6,
    },
    row: {
        flexDirection: "row",
        gap: 6,
    },
    tab: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 8,
        minHeight: 40,
    },
});