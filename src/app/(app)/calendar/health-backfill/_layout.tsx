// src/app/(app)/calendar/health-backfill/_layout.tsx
// Nested calendar route for Health Backfill screens.

import { getStackHeaderScreenOptions } from "@/src/theme/navigation";
import { useTheme } from "@/src/theme/ThemeProvider";
import { Stack } from "expo-router";
import * as React from "react";

export default function HealthBackfillLayout() {
    const theme = useTheme();

    return (
        <Stack screenOptions={getStackHeaderScreenOptions(theme)} >
            <Stack.Screen
                name="index"
                options={{
                    title: "Health Backfill",
                }}
            />
        </Stack>
    );
}