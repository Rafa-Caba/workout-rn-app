// src/features/trends/components/WeekKeyInputField.tsx
import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import { sanitizeWeekKeyInput } from "@/src/utils/trendsDefaults";

type Props = {
    label: string;
    value: string;
    onChange: (next: string) => void;
    placeholder?: string;
    disabled?: boolean;
};

export function WeekKeyInputField({ label, value, onChange, placeholder = "2026-W09", disabled }: Props) {
    const { colors } = useTheme();

    return (
        <View style={styles.wrap}>
            <Text style={[styles.label, { color: colors.mutedText }]}>{label}</Text>

            <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.background, opacity: disabled ? 0.6 : 1 }]}>
                <TextInput
                    value={value}
                    editable={!disabled}
                    placeholder={placeholder}
                    placeholderTextColor={colors.mutedText}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    onChangeText={(t) => onChange(sanitizeWeekKeyInput(t))}
                    style={[styles.input, { color: colors.text }]}
                />

                <Pressable
                    disabled={disabled}
                    onPress={() => onChange(sanitizeWeekKeyInput(value))}
                    style={({ pressed }) => [
                        styles.btn,
                        { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.9 : 1 },
                    ]}
                >
                    <Text style={[styles.btnText, { color: colors.text }]}>OK</Text>
                </Pressable>
            </View>

            <Text style={[styles.hint, { color: colors.mutedText }]}>Formato: YYYY-W##</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { flex: 1, gap: 6, paddingBottom: 5 },
    label: { fontSize: 12, fontWeight: "900" },
    hint: { fontSize: 11, fontWeight: "700" },

    inputRow: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    input: {
        flex: 1,
        fontWeight: "900",
        fontSize: 14,
        paddingVertical: 0,
    },
    btn: {
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    btnText: { fontWeight: "900", fontSize: 12 },
});