// src/features/admin/settings/components/AppSettingsLogoCard.tsx
import React from "react";
import { Image, Pressable, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

export function AppSettingsLogoCard(props: {
    logoUrl: string | null;
    onPick: () => void;
    onClear: () => void;
}) {
    const { colors } = useTheme();

    const hasLogo = Boolean(props.logoUrl && props.logoUrl.trim());

    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 14,
                padding: 12,
                backgroundColor: colors.background,
                gap: 10,
            }}
        >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontWeight: "900", color: colors.text }}>Logo de la app</Text>
                    <Text style={{ color: colors.mutedText, fontSize: 12 }}>PNG / JPG / WEBP hasta 1,024px aprox.</Text>
                </View>

                <Pressable
                    onPress={props.onPick}
                    style={({ pressed }) => ({
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: pressed ? colors.surface : colors.background,
                        opacity: pressed ? 0.92 : 1,
                    })}
                >
                    <Text style={{ fontWeight: "900", color: colors.text }}>Seleccionar logo</Text>
                </Pressable>
            </View>

            {hasLogo ? (
                <View style={{ gap: 10 }}>
                    <View
                        style={{
                            height: 64,
                            width: 64,
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.surface,
                            overflow: "hidden",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Image source={{ uri: props.logoUrl as string }} style={{ height: "100%", width: "100%" }} resizeMode="cover" />
                    </View>

                    <Pressable
                        onPress={props.onClear}
                        style={({ pressed }) => ({
                            paddingVertical: 12,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: pressed ? colors.surface : colors.background,
                            alignItems: "center",
                            opacity: pressed ? 0.92 : 1,
                        })}
                    >
                        <Text style={{ fontWeight: "900", color: "#EF4444" }}>Quitar logo</Text>
                    </Pressable>
                </View>
            ) : (
                <Text style={{ color: colors.mutedText }}>No hay logo configurado todavía.</Text>
            )}
        </View>
    );
}