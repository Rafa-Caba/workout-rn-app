// src/features/bodyMetrics/components/BodyMetricsEmptyState.tsx

import React from "react";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import { BodyMetricsIllustration } from "./BodyMetricsIllustration";

type Props = {
    onCreate: () => void;
};

export function BodyMetricsEmptyState({ onCreate }: Props) {
    const { colors } = useTheme();

    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 18,
                padding: 20,
                backgroundColor: colors.surface,
                alignItems: "center",
                gap: 12,
            }}
        >
            <BodyMetricsIllustration />

            <Text
                style={{
                    fontSize: 18,
                    fontWeight: "800",
                    color: colors.text,
                    textAlign: "center",
                }}
            >
                Aún no has registrado métricas corporales
            </Text>

            <Text
                style={{
                    color: colors.mutedText,
                    textAlign: "center",
                    lineHeight: 20,
                }}
            >
                Empieza con tu peso, cintura o porcentaje de grasa para enriquecer tu progreso y comparar cambios entre periodos.
            </Text>

            <Pressable
                onPress={onCreate}
                style={({ pressed }) => ({
                    marginTop: 4,
                    paddingHorizontal: 16,
                    paddingVertical: 11,
                    borderRadius: 12,
                    backgroundColor: colors.primary,
                    opacity: pressed ? 0.9 : 1,
                })}
            >
                <Text style={{ color: colors.primaryText, fontWeight: "800" }}>
                    Crear primer registro
                </Text>
            </Pressable>
        </View>
    );
}