// src/features/components/topbar/AppHeader.tsx
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TopBarMenus } from "@/src/features/components/topbar/TopBarMenus";
import { useTheme } from "@/src/theme/ThemeProvider";

type Props = any;

export function AppHeader(props: Props) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    const title = String(props?.options?.title ?? props?.route?.name ?? "").trim();
    const canGoBack = props?.navigation?.canGoBack?.() === true;
    const onBack = () => props?.navigation?.goBack?.();

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
                {/* Left */}
                <View style={{ width: 56, alignItems: "flex-start" }}>
                    {canGoBack ? (
                        <Pressable
                            onPress={onBack}
                            style={({ pressed }) => ({
                                height: 40,
                                width: 70,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: colors.border,
                                backgroundColor: pressed ? colors.background : colors.surface,
                                alignItems: "center",
                                justifyContent: "center",
                                display: 'flex',
                                flexDirection: 'row',
                                paddingEnd: 7
                            })}
                            accessibilityLabel="Regresar"
                        >
                            <MaterialCommunityIcons name="chevron-left" size={26} color={colors.text} />
                            <Text>Back</Text>
                        </Pressable>
                    ) : null}
                </View>

                {/* Center title */}
                <View style={{ flex: 1, alignItems: "center" }}>
                    <Text
                        numberOfLines={1}
                        style={{
                            fontSize: 18,
                            fontWeight: "900",
                            color: colors.text,
                        }}
                    >
                        {title}
                    </Text>
                </View>

                {/* Right */}
                <View style={{ width: 120, alignItems: "flex-end" }}>
                    <TopBarMenus />
                </View>
            </View>
        </View>
    );
}