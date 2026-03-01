// src/features/admin/settings/components/AppSettingsSelectRow.tsx
import React from "react";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

export function AppSettingsSelectRow(props: {
    label: string;
    valueLabel: string;
    onPress: () => void;
}) {
    const { colors } = useTheme();

    return (
        <Pressable
            onPress={props.onPress}
            style={({ pressed }) => ({
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 12,
                backgroundColor: pressed ? colors.background : colors.surface,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                opacity: pressed ? 0.92 : 1,
            })}
        >
            <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontWeight: "900", color: colors.text }}>{props.label}</Text>
                <Text style={{ color: colors.mutedText, fontWeight: "800" }}>{props.valueLabel}</Text>
            </View>

            <Text style={{ color: colors.mutedText, fontWeight: "900" }}>›</Text>
        </Pressable>
    );
}