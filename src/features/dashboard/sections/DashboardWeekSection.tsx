// /src/features/dashboard/sections/DashboardWeekSection.tsx

import React from "react";
import { Text, View } from "react-native";

import DashboardCard from "@/src/features/dashboard/components/DashboardCard";
import DashboardSectionBox from "@/src/features/dashboard/components/DashboardSectionBox";
import DashboardStatRow from "@/src/features/dashboard/components/DashboardStatRow";
import { useTheme } from "@/src/theme/ThemeProvider";
import { secondsToHhMm } from "@/src/utils/dashboard/format";

type DashboardWeekTraining = {
    sessionsCount: number;
    durationSeconds: number;
    activeKcal: number | null;
    avgHr: number | null;
    maxHr: number | null;
};

type DashboardWeekData = {
    weekKey: string;
    range: {
        from: string;
        to: string;
    };
    training: DashboardWeekTraining;
} | null;

type TrendPoint = {
    daysCount: number;
    mediaCount: number;
} | null;

type Props = {
    data: DashboardWeekData;
    trendPoint: TrendPoint;
    isLoading: boolean;
};

export default function DashboardWeekSection({
    data,
    trendPoint,
    isLoading,
}: Props) {
    const { colors } = useTheme();

    return (
        <DashboardCard title="Esta semana">
            {!data && isLoading ? (
                <Text style={{ color: colors.mutedText }}>Cargando...</Text>
            ) : null}

            {!data && !isLoading ? (
                <Text style={{ color: colors.mutedText }}>Sin datos todavía.</Text>
            ) : null}

            {data ? (
                <View style={{ gap: 10 }}>
                    <Text style={{ color: colors.mutedText }}>
                        <Text style={{ fontFamily: "Menlo", color: colors.text }}>
                            {data.weekKey}
                        </Text>{" "}
                        · {data.range.from} → {data.range.to}
                    </Text>

                    <DashboardSectionBox title="Resumen">
                        <DashboardStatRow
                            label="Sesiones"
                            value={data.training.sessionsCount}
                        />
                        <DashboardStatRow
                            label="Duración"
                            value={secondsToHhMm(data.training.durationSeconds)}
                        />
                        <DashboardStatRow
                            label="Kcal activas"
                            value={data.training.activeKcal ?? "—"}
                        />
                        <DashboardStatRow
                            label="HR avg / max"
                            value={`${data.training.avgHr ?? "—"} / ${data.training.maxHr ?? "—"}`}
                        />
                    </DashboardSectionBox>

                    <DashboardSectionBox title="Tendencia">
                        {!trendPoint ? (
                            <Text style={{ color: colors.mutedText }}>
                                Sin trend.
                            </Text>
                        ) : (
                            <Text style={{ color: colors.mutedText }}>
                                Días loggeados:{" "}
                                <Text style={{ fontWeight: "900", color: colors.text }}>
                                    {trendPoint.daysCount}
                                </Text>{" "}
                                · Media:{" "}
                                <Text style={{ fontWeight: "900", color: colors.text }}>
                                    {trendPoint.mediaCount}
                                </Text>
                            </Text>
                        )}
                    </DashboardSectionBox>
                </View>
            ) : null}
        </DashboardCard>
    );
}