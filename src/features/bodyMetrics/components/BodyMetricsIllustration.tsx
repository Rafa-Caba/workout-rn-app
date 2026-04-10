// src/features/bodyMetrics/components/BodyMetricsIllustration.tsx

import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

export function BodyMetricsIllustration() {
    const { colors } = useTheme();

    return (
        <View
            style={{
                width: 140,
                height: 120,
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
            }}
        >
            <View
                style={{
                    position: "absolute",
                    width: 112,
                    height: 112,
                    borderRadius: 999,
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: colors.border,
                }}
            />

            <View
                style={{
                    position: "absolute",
                    left: 14,
                    top: 18,
                    width: 42,
                    height: 42,
                    borderRadius: 999,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <MaterialCommunityIcons
                    name="scale-bathroom"
                    size={20}
                    color={colors.primary}
                />
            </View>

            <View
                style={{
                    position: "absolute",
                    right: 10,
                    top: 24,
                    width: 42,
                    height: 42,
                    borderRadius: 999,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <MaterialCommunityIcons
                    name="tape-measure"
                    size={20}
                    color={colors.text}
                />
            </View>

            <View
                style={{
                    width: 62,
                    height: 62,
                    borderRadius: 20,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <MaterialCommunityIcons
                    name="human-male-height"
                    size={30}
                    color={colors.primary}
                />
            </View>

            <View
                style={{
                    position: "absolute",
                    right: 20,
                    bottom: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    paddingHorizontal: 8,
                    paddingVertical: 5,
                    borderRadius: 999,
                    backgroundColor: colors.primary,
                }}
            >
                <MaterialCommunityIcons
                    name="chart-line"
                    size={14}
                    color={colors.primaryText}
                />
            </View>
        </View>
    );
}