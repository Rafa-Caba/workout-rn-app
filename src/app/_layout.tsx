// src/app/_layout.tsx
import { Slot } from "expo-router";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { useThemeSyncFromAppSettings } from "@/src/hooks/useThemeSyncFromAppSettings";
import { QueryProvider } from "@/src/providers/QueryProvider";
import { ThemeProvider } from "@/src/theme/ThemeProvider";

function AppBootSync() {
    useThemeSyncFromAppSettings();
    return null;
}

export default function AppLayout() {
    return (
        <SafeAreaProvider>
            <QueryProvider>
                <ThemeProvider>
                    <AppBootSync />
                    <Slot />
                    <Toast />
                </ThemeProvider>
            </QueryProvider>
        </SafeAreaProvider>
    );
}