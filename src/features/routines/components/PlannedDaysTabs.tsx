import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
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
    const accent = "#2563EB";

    if (!days.length) {
        return (
            <View style={{ paddingVertical: 6 }}>
                <Text style={{ color: "#6B7280" }}>No hay días planeados.</Text>
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
                        style={{
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: active ? accent : "#9CA3AF",
                            // backgroundColor: active ? accent : "transparent",
                        }}
                    >
                        <Text style={{ fontWeight: "900", color: active ? accent : "#111827" }}>{dayLabelEs(k)}</Text>
                        {/* <Text style={{ fontWeight: "900", color: active ? "#FFFFFF" : "#111827" }}>{dayLabelEs(k)}</Text> */}
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}