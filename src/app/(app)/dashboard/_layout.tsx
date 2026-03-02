// src/app/(app)/dashboard/_layout.tsx
import { Stack } from "expo-router";
import React from "react";

import { useTheme } from "@/src/theme/ThemeProvider";
import { getStackHeaderScreenOptions } from "@/src/theme/navigation";

export default function DashboardLayout() {
    const theme = useTheme();

    return (
        <Stack
            screenOptions={getStackHeaderScreenOptions(theme)}
        >
            <Stack.Screen name="index" options={{ title: "Dashboard" }} />
        </Stack>
    );
}