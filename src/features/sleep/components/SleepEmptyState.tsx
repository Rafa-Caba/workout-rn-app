// src/features/sleep/components/SleepEmptyState.tsx
import React from "react";
import { Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

export function SleepEmptyState() {
    const { colors } = useTheme();

    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 16,
                alignItems: "center",
                gap: 6,
            }}
        >
            <Text style={{ fontWeight: "900", color: colors.text }}>Sin datos de sueño</Text>
            <Text style={{ color: colors.mutedText, textAlign: "center" }}>
                Aún no hay información guardada para este día. Llena los campos y guarda.
            </Text>
        </View>
    );
}