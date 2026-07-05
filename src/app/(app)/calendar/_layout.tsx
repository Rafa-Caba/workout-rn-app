// src/app/(app)/calendar/_layout.tsx

import { Stack } from "expo-router";
import React from "react";

import { useTheme } from "@/src/theme/ThemeProvider";
import { getStackHeaderScreenOptions } from "@/src/theme/navigation";

export default function CalendarLayout() {
    const theme = useTheme();

    return (
        <Stack screenOptions={getStackHeaderScreenOptions(theme)}>
            <Stack.Screen name="index" options={{ title: "Calendario" }} />

            <Stack.Screen name="day/[date]" options={{ title: "Resumen del Día" }} />

            <Stack.Screen name="weekView/[weekKey]" options={{ title: "Resumen Semanal" }} />

            <Stack.Screen name="cardio/[date]" options={{ title: "Cardio" }} />
            <Stack.Screen name="cardio/live" options={{ title: "Live Cardio" }} />
            <Stack.Screen name="cardio/live-summary" options={{ title: "Resumen Live" }} />
            <Stack.Screen name="cardio/manual" options={{ title: "Captura Cardio" }} />
            <Stack.Screen
                name="cardio/edit/[date]/[sessionId]"
                options={{ title: "Editar Cardio" }}
            />
            <Stack.Screen
                name="cardio/session/[date]/[sessionId]"
                options={{ title: "Detalle Cardio" }}
            />


            <Stack.Screen name="routines" options={{ headerShown: false }} />
            <Stack.Screen name="gym-check" options={{ headerShown: false }} />
            <Stack.Screen name="health-backfill" options={{ headerShown: false }} />
        </Stack>
    );
}
