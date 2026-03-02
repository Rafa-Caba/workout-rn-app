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

            {/* hide parent header for nested stacks so we don't get double headers */}
            <Stack.Screen name="routines" options={{ headerShown: false }} />
            <Stack.Screen name="gym-check" options={{ headerShown: false }} />

            {/* IMPORTANT: dynamic route is "day/[date]" (not "day") */}
            <Stack.Screen name="day/[date]" options={{ title: "Resumen del Día" }} />

            <Stack.Screen name="weekView/[weekKey]" options={{ title: "Resumen Semanal" }} />
        </Stack>
    );
}