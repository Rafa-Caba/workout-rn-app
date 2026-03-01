// src/features/components/branding/AppBrandFooter.tsx
import React from "react";
import { Text, View } from "react-native";

import { useAppSettings } from "@/src/hooks/admin/useAppSettings";
import { useTheme } from "@/src/theme/ThemeProvider";

type AppSettingsMaybeSubtitle = {
    appName?: string;
    appSubtitle?: string | null;
};

export function AppBrandFooter() {
    const { colors } = useTheme();
    const { settings } = useAppSettings(true);

    const s = (settings ?? {}) as AppSettingsMaybeSubtitle;

    const appName = String(s.appName ?? "").trim() || "Workout Tracker";
    const subtitle = typeof s.appSubtitle === "string" && s.appSubtitle.trim()
        ? s.appSubtitle.trim()
        : "Seguimiento de entrenamiento y sueño";

    return (
        <View style={{ alignItems: "center", gap: 6, paddingTop: 6 }}>
            <View
                style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    borderRadius: 999,
                    paddingHorizontal: 18,
                    paddingVertical: 12,
                    alignItems: "center",
                    maxWidth: "92%",
                }}
            >
                <Text style={{ fontWeight: "900", color: colors.text }}>{appName}</Text>
                <Text style={{ color: colors.mutedText, fontWeight: "700", fontSize: 12 }}>{subtitle}</Text>
            </View>

            <Text style={{ color: colors.mutedText, fontSize: 11, opacity: 0.7, fontStyle: 'italic' }}>
                By Rafael Cabanillas - © {new Date().getFullYear()}
            </Text>
        </View>
    );
}