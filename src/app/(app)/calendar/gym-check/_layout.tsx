// src/app/(app)/calendar/gym-check/_layout.tsx
import { Stack } from "expo-router";
import React from "react";

import { useTheme } from "@/src/theme/ThemeProvider";
import { getStackHeaderScreenOptions } from "@/src/theme/navigation";

export default function GymCheckLayout() {
    const theme = useTheme();

    return (
        <Stack screenOptions={getStackHeaderScreenOptions(theme)}>
            <Stack.Screen name="index" options={{ title: "Gym Check" }} />
            <Stack.Screen name="[date]" options={{ title: "Gym Check (Día)" }} />
            <Stack.Screen name="session/[sessionId]" options={{ title: "Gym Check (Sesión)" }} />
        </Stack>
    );
}