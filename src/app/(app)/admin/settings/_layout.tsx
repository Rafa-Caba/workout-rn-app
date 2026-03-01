// src/app/(app)/admin/settings/_layout.tsx
import { getStackHeaderScreenOptions } from "@/src/theme/navigation";
import { useTheme } from "@/src/theme/ThemeProvider";
import { Stack } from "expo-router";
import React from "react";

export default function AdminSettingsLayout() {
    const theme = useTheme();

    return (
        <Stack screenOptions={getStackHeaderScreenOptions(theme)}>
            <Stack.Screen
                name="index"
                options={{
                    title: "Ajustes de la app",
                    headerShown: true,
                }}
            />
        </Stack>
    );
}