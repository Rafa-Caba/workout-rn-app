// src/app/(app)/periods/_layout.tsx
// Stack wrapper for the Periods route opened from the Más menu.

import { Stack } from "expo-router";
import React from "react";

import { useTheme } from "@/src/theme/ThemeProvider";
import { getStackHeaderScreenOptions } from "@/src/theme/navigation";

export default function PeriodsLayout() {
    const theme = useTheme();

    return (
        <Stack screenOptions={getStackHeaderScreenOptions(theme)}>
            <Stack.Screen name="index" options={{ title: "Periodos" }} />
        </Stack>
    );
}
