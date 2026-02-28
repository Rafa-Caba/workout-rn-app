// src/app/(app)/calendar/routines/_layout.tsx
import { Stack } from "expo-router";
import React from "react";

import { useTheme } from "@/src/theme/ThemeProvider";
import { getStackHeaderScreenOptions } from "@/src/theme/navigation";

export default function RoutinesLayout() {
    const theme = useTheme();

    return (
        <Stack screenOptions={getStackHeaderScreenOptions(theme)}>
            <Stack.Screen name="index" options={{ title: "Rutinas" }} />
            <Stack.Screen name="week/[weekKey]" options={{ title: "Rutina (Semana)" }} />
            <Stack.Screen name="day/[date]" options={{ title: "Rutina (Día)" }} />
        </Stack>
    );
}