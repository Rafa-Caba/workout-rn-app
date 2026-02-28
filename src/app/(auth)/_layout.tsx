// src/app/(auth)/_layout.tsx
import { Stack } from "expo-router";
import React from "react";

import { useTheme } from "@/src/theme/ThemeProvider";
import { getStackHeaderScreenOptions } from "@/src/theme/navigation";

export default function AuthLayout() {
    const theme = useTheme();

    return (
        <Stack screenOptions={getStackHeaderScreenOptions(theme)}>
            <Stack.Screen name="login" options={{ title: "Iniciar sesión" }} />
            <Stack.Screen name="register" options={{ title: "Crear cuenta" }} />
        </Stack>
    );
}