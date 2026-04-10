// src/features/bodyMetrics/components/BodyMetricsEntryCard.tsx

import React from "react";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { UserMetricEntry } from "@/src/types/bodyMetrics.types";

function formatValue(value: number | null, suffix: string): string {
    if (value === null || Number.isNaN(value)) {
        return "—";
    }

    return `${value.toFixed(1)} ${suffix}`.trim();
}

type Props = {
    entry: UserMetricEntry;
    onEdit: () => void;
    onDelete: () => void;
};

export function BodyMetricsEntryCard({ entry, onEdit, onDelete }: Props) {
    const { colors } = useTheme();

    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 16,
                padding: 12,
                backgroundColor: colors.surface,
                gap: 10,
            }}
        >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <View style={{ gap: 2, flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: "800", fontSize: 16 }}>
                        {entry.date}
                    </Text>
                    <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                        Fuente: {entry.source}
                    </Text>
                </View>

                <View style={{ flexDirection: "row", gap: 8 }}>
                    <Pressable
                        onPress={onEdit}
                        style={({ pressed }) => ({
                            paddingHorizontal: 12,
                            paddingVertical: 9,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: pressed ? colors.background : colors.surface,
                            opacity: pressed ? 0.92 : 1,
                        })}
                    >
                        <Text style={{ color: colors.text, fontWeight: "800" }}>Editar</Text>
                    </Pressable>

                    <Pressable
                        onPress={onDelete}
                        style={({ pressed }) => ({
                            paddingHorizontal: 12,
                            paddingVertical: 9,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: colors.danger,
                            backgroundColor: pressed ? colors.background : colors.surface,
                            opacity: pressed ? 0.92 : 1,
                        })}
                    >
                        <Text style={{ color: colors.danger, fontWeight: "800" }}>Eliminar</Text>
                    </Pressable>
                </View>
            </View>

            <View
                style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 12,
                    padding: 10,
                    backgroundColor: colors.background,
                    gap: 8,
                }}
            >
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                    <Text style={{ color: colors.mutedText, fontWeight: "700" }}>Peso</Text>
                    <Text style={{ color: colors.text, fontWeight: "800" }}>
                        {formatValue(entry.weightKg, "kg")}
                    </Text>
                </View>

                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                    <Text style={{ color: colors.mutedText, fontWeight: "700" }}>Grasa corporal</Text>
                    <Text style={{ color: colors.text, fontWeight: "800" }}>
                        {formatValue(entry.bodyFatPct, "%")}
                    </Text>
                </View>

                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                    <Text style={{ color: colors.mutedText, fontWeight: "700" }}>Cintura</Text>
                    <Text style={{ color: colors.text, fontWeight: "800" }}>
                        {formatValue(entry.waistCm, "cm")}
                    </Text>
                </View>
            </View>

            {entry.notes ? (
                <View
                    style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 12,
                        padding: 10,
                        backgroundColor: colors.background,
                        gap: 4,
                    }}
                >
                    <Text style={{ color: colors.mutedText, fontWeight: "700", fontSize: 12 }}>
                        Notas
                    </Text>
                    <Text style={{ color: colors.text }}>{entry.notes}</Text>
                </View>
            ) : null}

            {entry.customMetrics.length ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {entry.customMetrics.map((metric) => (
                        <View
                            key={`${entry.id}-${metric.key}`}
                            style={{
                                borderWidth: 1,
                                borderColor: colors.border,
                                borderRadius: 999,
                                paddingHorizontal: 10,
                                paddingVertical: 7,
                                backgroundColor: colors.background,
                            }}
                        >
                            <Text style={{ color: colors.text, fontWeight: "700", fontSize: 12 }}>
                                {metric.label}: {metric.value} {metric.unit}
                            </Text>
                        </View>
                    ))}
                </View>
            ) : null}
        </View>
    );
}