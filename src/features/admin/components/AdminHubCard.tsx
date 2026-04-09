// src/features/admin/components/AdminHubCard.tsx
import React from "react";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

export function AdminHubCard(props: {
    title: string;
    subtitle: string;
    buttonText: string;
    onPress: () => void;
}) {
    const { colors } = useTheme();

    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 14,
                gap: 10,
            }}
        >
            <View style={{ gap: 4 }}>
                <Text style={{ fontWeight: "800", color: colors.text, fontSize: 16 }}>{props.title}</Text>
                <Text style={{ color: colors.mutedText }}>{props.subtitle}</Text>
            </View>

            <Pressable
                onPress={props.onPress}
                style={({ pressed }) => ({
                    paddingVertical: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: pressed ? colors.background : colors.surface,
                    alignItems: "center",
                    opacity: pressed ? 0.8 : 1,
                })}
            >
                <Text style={{ fontWeight: "800", color: colors.text }}>{props.buttonText}</Text>
            </Pressable>
        </View>
    );
}