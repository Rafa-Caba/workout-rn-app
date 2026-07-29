// /src/features/components/topbar/AppHeader.tsx
// Accessible custom header shared by Expo Router native stacks.

import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackHeaderProps } from "@react-navigation/native-stack";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TopBarMenus } from "@/src/features/components/topbar/TopBarMenus";
import { useTheme } from "@/src/theme/ThemeProvider";

export function AppHeader(props: NativeStackHeaderProps) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    const title = String(props.options.title ?? props.route.name).trim();
    const canGoBack = props.navigation.canGoBack();
    const onBack = () => props.navigation.goBack();

    return (
        <View
            style={{
                backgroundColor: colors.surface,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                paddingTop: insets.top,
            }}
        >
            <View
                style={{
                    height: 52,
                    paddingHorizontal: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                }}
            >
                <View style={{ width: 70, alignItems: "flex-start" }}>
                    {canGoBack ? (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Regresar"
                            accessibilityHint="Vuelve a la pantalla anterior"
                            hitSlop={8}
                            onPress={onBack}
                            style={({ pressed }) => ({
                                minHeight: 44,
                                minWidth: 70,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: colors.border,
                                backgroundColor: pressed ? colors.background : colors.surface,
                                alignItems: "center",
                                justifyContent: "center",
                                flexDirection: "row",
                                paddingEnd: 7,
                            })}
                        >
                            <MaterialCommunityIcons name="chevron-left" size={26} color={colors.text} />
                            <Text style={{ color: colors.text }}>Atrás</Text>
                        </Pressable>
                    ) : null}
                </View>

                <View style={{ flex: 1, alignItems: "center" }}>
                    <Text
                        numberOfLines={1}
                        style={{
                            fontSize: 18,
                            fontWeight: "800",
                            color: colors.text,
                        }}
                    >
                        {title}
                    </Text>
                </View>

                <View style={{ width: 120, alignItems: "flex-end" }}>
                    <TopBarMenus />
                </View>
            </View>
        </View>
    );
}
