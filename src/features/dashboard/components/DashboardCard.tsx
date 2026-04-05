// /src/features/dashboard/components/DashboardCard.tsx

import React from "react";
import { Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

type DashboardCardProps = {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
};

export default function DashboardCard({
    title,
    subtitle,
    children,
}: DashboardCardProps) {
    const { colors } = useTheme();

    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 14,
                padding: 12,
                gap: 8,
                backgroundColor: colors.surface,
            }}
        >
            <View style={{ gap: 2 }}>
                <Text
                    style={{
                        fontSize: 16,
                        fontWeight: "900",
                        color: colors.text,
                    }}
                >
                    {title}
                </Text>

                {subtitle ? (
                    <Text style={{ color: colors.mutedText }}>{subtitle}</Text>
                ) : null}
            </View>

            {children}
        </View>
    );
}