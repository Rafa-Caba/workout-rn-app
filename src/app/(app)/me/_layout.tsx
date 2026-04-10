// src/app/(app)/me/_layout.tsx
import { Stack } from "expo-router";
import React from "react";

import { useTheme } from "@/src/theme/ThemeProvider";
import { getStackHeaderScreenOptions } from "@/src/theme/navigation";

export default function MeLayout() {
    const theme = useTheme();

    return (
        <Stack screenOptions={getStackHeaderScreenOptions(theme)}>
            <Stack.Screen
                name="index"
                options={{
                    title: "Mi perfil",
                }}
            />
            <Stack.Screen
                name="edit"
                options={{
                    title: "Editar perfil",
                }}
            />
            <Stack.Screen
                name="body-metrics"
                options={{
                    title: "Cuerpo - Métricas",
                }}
            />
        </Stack>
    );
}