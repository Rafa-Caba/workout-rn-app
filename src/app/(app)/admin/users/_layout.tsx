// src/app/(app)/admin/users/_layout.tsx
import { getStackHeaderScreenOptions } from "@/src/theme/navigation";
import { useTheme } from "@/src/theme/ThemeProvider";
import { Stack } from "expo-router";
import React from "react";

export default function AdminUsersLayout() {
    const theme = useTheme();

    return (
        <Stack screenOptions={getStackHeaderScreenOptions(theme)}>
            <Stack.Screen
                name="index"
                options={{
                    title: "Usuarios",
                    headerShown: true,
                }}
            />

            <Stack.Screen
                name="new"
                options={{
                    title: "Nuevo usuario",
                    headerShown: true,
                }}
            />

            <Stack.Screen
                name="[id]"
                options={{
                    title: "Editar usuario",
                    headerShown: true,
                }}
            />
        </Stack>
    );
}