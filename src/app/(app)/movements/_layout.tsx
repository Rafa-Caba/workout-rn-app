// src/app/(app)/movements/_layout.tsx
import { Stack } from "expo-router";
import React from "react";

import { useTheme } from "@/src/theme/ThemeProvider";
import { getStackHeaderScreenOptions } from "@/src/theme/navigation";

export default function MovementsLayout() {
    const theme = useTheme();

    return (
        <Stack screenOptions={getStackHeaderScreenOptions(theme)}>
            <Stack.Screen name="index" options={{ title: "Ejercicios" }} />
            <Stack.Screen name="new" options={{ title: "Nuevo Ejercicio" }} />
            <Stack.Screen name="[id]" options={{ title: "Ejercicio" }} />
        </Stack>
    );
}