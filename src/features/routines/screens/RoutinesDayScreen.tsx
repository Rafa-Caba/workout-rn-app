// src/routines/screens/RoutinesDayScreen.tsx
import React from "react";
import { Text, View } from "react-native";

type Props = { date: string };

export function RoutinesDayScreen({ date }: Props) {
    return (
        <View style={{ flex: 1, padding: 16, gap: 8 }}>
            <Text style={{ fontSize: 20, fontWeight: "800" }}>Rutina (Día)</Text>
            <Text style={{ color: "#6B7280" }}>
                date: <Text style={{ fontFamily: "Menlo" }}>{date || "—"}</Text>
            </Text>
        </View>
    );
}