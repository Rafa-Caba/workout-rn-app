// /src/features/dashboard/sections/DashboardStreakSection.tsx

import React from "react";
import { Text, View } from "react-native";

import DashboardCard from "@/src/features/dashboard/components/DashboardCard";
import { useTheme } from "@/src/theme/ThemeProvider";

type StreakData = {
    asOf: string;
    currentStreakDays: number;
    longestStreakDays: number;
    lastQualifiedDate: string | null;
} | null;

type Props = {
    data: StreakData;
    isLoading: boolean;
};

export default function DashboardStreakSection({
    data,
    isLoading,
}: Props) {
    const { colors } = useTheme();

    return (
        <DashboardCard title="Racha">
            {!data && isLoading ? (
                <Text style={{ color: colors.mutedText }}>Cargando...</Text>
            ) : null}

            {!data && !isLoading ? (
                <Text style={{ color: colors.mutedText }}>Sin datos todavía.</Text>
            ) : null}

            {data ? (
                <View
                    style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 12,
                        padding: 12,
                        gap: 6,
                        backgroundColor: colors.background,
                    }}
                >
                    <Text style={{ color: colors.mutedText }}>
                        Al día:{" "}
                        <Text style={{ fontFamily: "Menlo", color: colors.text }}>
                            {data.asOf}
                        </Text>
                    </Text>

                    <Text
                        style={{
                            fontSize: 36,
                            fontWeight: "900",
                            color: colors.primary,
                        }}
                    >
                        {data.currentStreakDays}
                    </Text>

                    <Text style={{ color: colors.mutedText }}>días</Text>

                    <Text style={{ color: colors.mutedText }}>
                        Más larga:{" "}
                        <Text style={{ fontWeight: "900", color: colors.text }}>
                            {data.longestStreakDays}
                        </Text>{" "}
                        · Último día:{" "}
                        <Text style={{ fontWeight: "900", color: colors.text }}>
                            {data.lastQualifiedDate ?? "—"}
                        </Text>
                    </Text>
                </View>
            ) : null}
        </DashboardCard>
    );
}