// /src/features/dashboard/components/DashboardSectionBox.tsx

import React from "react";
import { Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

type DashboardSectionBoxProps = {
    title: string;
    children: React.ReactNode;
};

export default function DashboardSectionBox({
    title,
    children,
}: DashboardSectionBoxProps) {
    const { colors } = useTheme();

    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                padding: 10,
                gap: 6,
                backgroundColor: colors.background,
            }}
        >
            <Text style={{ fontWeight: "800", color: colors.text }}>{title}</Text>
            {children}
        </View>
    );
}