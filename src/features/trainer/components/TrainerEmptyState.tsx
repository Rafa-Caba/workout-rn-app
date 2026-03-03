// src/features/trainer/components/TrainerEmptyState.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

export function TrainerEmptyState() {
    const { colors } = useTheme();

    return (
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={{ fontWeight: "800", color: colors.text, fontSize: 16 }}>Selecciona un trainee para comenzar</Text>
            <Text style={{ marginTop: 6, color: colors.mutedText, fontWeight: "700", fontSize: 13, textAlign: 'center' }}>
                Aquí podrás ver su resumen semanal, día a día, recuperación y asignar rutina planificada.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        gap: 6,
        alignItems: "center",
        justifyContent: "center",
    },
});