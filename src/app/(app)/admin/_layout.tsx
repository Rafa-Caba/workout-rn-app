// src/app/(app)/admin/_layout.tsx
import { getStackHeaderScreenOptions } from "@/src/theme/navigation";
import { useTheme } from "@/src/theme/ThemeProvider";
import { Stack } from "expo-router";
import React from "react";

export default function AdminLayout() {
    const theme = useTheme();

    return (
        <Stack screenOptions={getStackHeaderScreenOptions(theme)}>
            <Stack.Screen
                name="index"
                options={{
                    title: "Admin",
                    headerShown: true,
                }}
            />

            {/* Nested stacks (their own _layout.tsx controls deeper screens) */}
            <Stack.Screen
                name="users"
                options={{
                    title: "Usuarios",
                    headerShown: false,
                }}
            />

            <Stack.Screen
                name="settings"
                options={{
                    title: "Ajustes de la app",
                    headerShown: false,
                }}
            />
        </Stack>
    );
}