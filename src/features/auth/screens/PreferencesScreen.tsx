// src/features/auth/screens/PreferencesScreen.tsx
import React from "react";
import { Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

export default function PreferencesScreen() {
    const { colors } = useTheme();

    return (
        <View style={{ flex: 1, backgroundColor: colors.background, padding: 16, gap: 12 }}>
            <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 22, fontWeight: "900", color: colors.text }}>Preferencias</Text>
                <Text style={{ color: colors.mutedText }}>Placeholder</Text>
            </View>

            <View
                style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    borderRadius: 14,
                    padding: 14,
                    gap: 6,
                }}
            >
                <Text style={{ fontWeight: "900", color: colors.text }}>Tema</Text>
                <Text style={{ color: colors.mutedText }}>
                    Aquí irá el selector de modo (claro/oscuro/sistema) y paleta.
                </Text>
            </View>

            <View
                style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    borderRadius: 14,
                    padding: 14,
                    gap: 6,
                }}
            >
                <Text style={{ fontWeight: "900", color: colors.text }}>Unidades</Text>
                <Text style={{ color: colors.mutedText }}>
                    Aquí irán unidades (kg/lb) y otras preferencias.
                </Text>
            </View>
        </View>
    );
}