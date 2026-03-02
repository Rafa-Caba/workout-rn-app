// src/features/routines/components/PlannedDaysTabs.tsx
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

import type { DayKey } from "../../../types/workoutRoutine.types";

function dayLabelEs(k: DayKey): string {
    switch (k) {
        case "Mon":
            return "Lun";
        case "Tue":
            return "Mar";
        case "Wed":
            return "Mié";
        case "Thu":
            return "Jue";
        case "Fri":
            return "Vie";
        case "Sat":
            return "Sáb";
        case "Sun":
            return "Dom";
        default:
            return k;
    }
}

type Props = {
    days: DayKey[];
    value: DayKey | null;
    onChange: (k: DayKey) => void;
};

export function PlannedDaysTabs({ days, value, onChange }: Props) {
    const { colors } = useTheme();

    if (!days.length) {
        return (
            <View style={{ paddingVertical: 6 }}>
                <Text style={{ color: colors.mutedText }}>No hay días planeados.</Text>
            </View>
        );
    }

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {days.map((k) => {
                const active = value === k;

                return (
                    <Pressable
                        key={k}
                        onPress={() => onChange(k)}
                        style={({ pressed }) => ({
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: active ? colors.primary : colors.border,
                            backgroundColor: active ? colors.primary : "transparent",
                            opacity: pressed ? 0.92 : 1,
                        })}
                    >
                        <Text style={{ fontWeight: "900", color: active ? colors.primaryText : colors.text }}>
                            {dayLabelEs(k)}
                        </Text>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}