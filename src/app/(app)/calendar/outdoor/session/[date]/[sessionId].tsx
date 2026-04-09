// src/app/(app)/calendar/outdoor/session/[date]/[sessionId].tsx

import { useLocalSearchParams } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

import OutdoorSessionDetailsScreen from "@/src/features/health/outdoor/screens/OutdoorSessionDetailsScreen";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { ISODate } from "@/src/types/workoutDay.types";

export default function CalendarOutdoorSessionDetailsRoute() {
    const params = useLocalSearchParams<{ date?: string; sessionId?: string }>();
    const { colors } = useTheme();

    const date =
        typeof params.date === "string" && params.date.trim().length > 0
            ? (params.date as ISODate)
            : null;

    const sessionId =
        typeof params.sessionId === "string" && params.sessionId.trim().length > 0
            ? params.sessionId
            : null;

    if (!date || !sessionId) {
        return (
            <View
                style={{
                    flex: 1,
                    backgroundColor: colors.background,
                    padding: 16,
                    justifyContent: "center",
                }}
            >
                <Text style={{ color: colors.text, fontWeight: "800" }}>
                    Faltan parámetros para abrir el detalle outdoor.
                </Text>
            </View>
        );
    }

    return <OutdoorSessionDetailsScreen date={date} sessionId={sessionId} />;
}