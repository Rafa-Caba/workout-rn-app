// src/features/bodyMetrics/components/BodyMetricsHeroCard.tsx

import React from "react";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { UserMetricEntry } from "@/src/types/bodyMetrics.types";

function formatMetricValue(
    value: number | null,
    unit: "kg" | "%" | "cm"
): string {
    if (value === null || Number.isNaN(value)) {
        return "—";
    }

    if (unit === "%") {
        return `${value.toFixed(1)}%`;
    }

    return `${value.toFixed(1)} ${unit}`;
}

type Props = {
    latest: UserMetricEntry | null;
    onCreate: () => void;
};

export function BodyMetricsHeroCard({ latest, onCreate }: Props) {
    const { colors } = useTheme();

    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 18,
                padding: 14,
                gap: 12,
                backgroundColor: colors.surface,
            }}
        >
            <View style={{ gap: 3 }}>
                <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text }}>
                    Métricas corporales
                </Text>
                <Text style={{ color: colors.mutedText }}>
                    Sigue tu evolución corporal y úsala dentro del módulo de progreso.
                </Text>
            </View>

            <View
                style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 14,
                    padding: 12,
                    backgroundColor: colors.background,
                    gap: 10,
                }}
            >
                <Text style={{ color: colors.text, fontWeight: "800" }}>
                    {latest ? `Último registro: ${latest.date}` : "Sin registros todavía"}
                </Text>

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                    <View
                        style={{
                            width: "48%",
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 12,
                            padding: 10,
                            backgroundColor: colors.surface,
                            gap: 4,
                        }}
                    >
                        <Text style={{ color: colors.mutedText, fontWeight: "700", fontSize: 12 }}>
                            Peso
                        </Text>
                        <Text style={{ color: colors.text, fontWeight: "800", fontSize: 18 }}>
                            {formatMetricValue(latest?.weightKg ?? null, "kg")}
                        </Text>
                    </View>

                    <View
                        style={{
                            width: "48%",
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 12,
                            padding: 10,
                            backgroundColor: colors.surface,
                            gap: 4,
                        }}
                    >
                        <Text style={{ color: colors.mutedText, fontWeight: "700", fontSize: 12 }}>
                            Grasa corporal
                        </Text>
                        <Text style={{ color: colors.text, fontWeight: "800", fontSize: 18 }}>
                            {formatMetricValue(latest?.bodyFatPct ?? null, "%")}
                        </Text>
                    </View>

                    <View
                        style={{
                            width: "48%",
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 12,
                            padding: 10,
                            backgroundColor: colors.surface,
                            gap: 4,
                        }}
                    >
                        <Text style={{ color: colors.mutedText, fontWeight: "700", fontSize: 12 }}>
                            Cintura
                        </Text>
                        <Text style={{ color: colors.text, fontWeight: "800", fontSize: 18 }}>
                            {formatMetricValue(latest?.waistCm ?? null, "cm")}
                        </Text>
                    </View>

                    <View
                        style={{
                            width: "48%",
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 12,
                            padding: 10,
                            backgroundColor: colors.surface,
                            gap: 4,
                        }}
                    >
                        <Text style={{ color: colors.mutedText, fontWeight: "700", fontSize: 12 }}>
                            Origen
                        </Text>
                        <Text style={{ color: colors.text, fontWeight: "800", fontSize: 16 }}>
                            {latest?.source ? latest.source : "—"}
                        </Text>
                    </View>
                </View>
            </View>

            <Pressable
                onPress={onCreate}
                style={({ pressed }) => ({
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: colors.primary,
                    alignItems: "center",
                    opacity: pressed ? 0.92 : 1,
                })}
            >
                <Text style={{ color: colors.primaryText, fontWeight: "800" }}>
                    Nuevo registro
                </Text>
            </Pressable>
        </View>
    );
}