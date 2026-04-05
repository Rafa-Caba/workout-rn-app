// /src/features/dashboard/components/DashboardStatRow.tsx

import React from "react";
import { Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

type DashboardStatRowProps = {
    label: string;
    value: string | number;
};

export default function DashboardStatRow({
    label,
    value,
}: DashboardStatRowProps) {
    const { colors } = useTheme();

    return (
        <View
            style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 12,
            }}
        >
            <Text style={{ color: colors.mutedText }}>{label}</Text>
            <Text style={{ fontWeight: "800", color: colors.text }}>{value}</Text>
        </View>
    );
}