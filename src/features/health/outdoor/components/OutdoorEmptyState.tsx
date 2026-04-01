// src/features/health/outdoor/components/OutdoorEmptyState.tsx

import React from "react";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

type Props = {
    title?: string;
    description?: string;
    onRetry?: () => void;
    retryLabel?: string;
};

export function OutdoorEmptyState({
    title = "No hubo caminatas ni carreras importadas",
    description = "Todavía no encontramos sesiones de walking o running para este día desde HealthKit / Health Connect.",
    onRetry,
    retryLabel = "Reintentar sync",
}: Props) {
    const { colors } = useTheme();

    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 16,
                padding: 20,
                backgroundColor: colors.surface,
                alignItems: "center",
                gap: 10,
            }}
        >
            <Text style={{ fontSize: 40 }}>🏃</Text>

            <Text
                style={{
                    fontSize: 18,
                    fontWeight: "900",
                    color: colors.text,
                    textAlign: "center",
                }}
            >
                {title}
            </Text>

            <Text
                style={{
                    fontSize: 14,
                    color: colors.mutedText,
                    textAlign: "center",
                    lineHeight: 20,
                }}
            >
                {description}
            </Text>

            {onRetry ? (
                <Pressable
                    onPress={onRetry}
                    style={({ pressed }) => ({
                        marginTop: 6,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.primary,
                        backgroundColor: colors.primary,
                        opacity: pressed ? 0.82 : 1,
                    })}
                >
                    <Text style={{ fontWeight: "900", color: colors.primaryText }}>
                        {retryLabel}
                    </Text>
                </Pressable>
            ) : null}
        </View>
    );
}

export default OutdoorEmptyState;