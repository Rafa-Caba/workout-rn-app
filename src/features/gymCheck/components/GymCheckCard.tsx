// src/features/gymCheck/components/GymCheckCard.tsx
import React from "react";
import { Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

type Props = {
    title: string;
    children: React.ReactNode;
};

export function GymCheckCard({ title, children }: Props) {
    const { colors } = useTheme();

    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 16,
                padding: 14,
                gap: 12,
                backgroundColor: colors.surface,
            }}
        >
            <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text }}>{title}</Text>
            {children}
        </View>
    );
}