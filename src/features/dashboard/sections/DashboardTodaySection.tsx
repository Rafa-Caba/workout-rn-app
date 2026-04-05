// /src/features/dashboard/sections/DashboardTodaySection.tsx

import React from "react";
import { Text, View } from "react-native";

import DashboardCard from "@/src/features/dashboard/components/DashboardCard";
import DashboardSectionBox from "@/src/features/dashboard/components/DashboardSectionBox";
import DashboardStatRow from "@/src/features/dashboard/components/DashboardStatRow";
import { useTheme } from "@/src/theme/ThemeProvider";
import { minutesToHhMm, secondsToHhMm } from "@/src/utils/dashboard/format";

type DashboardTodayTraining = {
    sessionsCount: number;
    durationSeconds: number;
    activeKcal: number | null;
    avgHr: number | null;
    maxHr: number | null;
};

type DashboardTodaySleep = {
    totalMinutes?: number | null;
    deepMinutes?: number | null;
    remMinutes?: number | null;
    score?: number | null;
} | null;

type DashboardTodayData = {
    date: string;
    weekKey: string | null;
    training: DashboardTodayTraining;
    sleep: DashboardTodaySleep;
} | null;

type Props = {
    data: DashboardTodayData;
    isLoading: boolean;
};

export default function DashboardTodaySection({ data, isLoading }: Props) {
    const { colors } = useTheme();

    return (
        <DashboardCard title="Hoy">
            {!data && isLoading ? (
                <Text style={{ color: colors.mutedText }}>Cargando...</Text>
            ) : null}

            {!data && !isLoading ? (
                <Text style={{ color: colors.mutedText }}>Sin datos todavía.</Text>
            ) : null}

            {data ? (
                <View style={{ gap: 10 }}>
                    <Text style={{ color: colors.mutedText }}>
                        Fecha:{" "}
                        <Text style={{ fontFamily: "Menlo", color: colors.text }}>
                            {data.date}
                        </Text>{" "}
                        · WeekKey:{" "}
                        <Text style={{ fontFamily: "Menlo", color: colors.text }}>
                            {data.weekKey ?? "—"}
                        </Text>
                    </Text>

                    <DashboardSectionBox title="Entrenamiento">
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

                    <DashboardSectionBox title="Sueño">
                        {!data.sleep ? (
                            <Text style={{ color: colors.mutedText }}>
                                Sin datos de sueño.
                            </Text>
                        ) : (
                            <>
                                <DashboardStatRow
                                    label="Total"
                                    value={
                                        data.sleep.totalMinutes != null
                                            ? minutesToHhMm(data.sleep.totalMinutes)
                                            : "—"
                                    }
                                />
                                <DashboardStatRow
                                    label="Deep / REM (min)"
                                    value={`${data.sleep.deepMinutes ?? "—"} / ${data.sleep.remMinutes ?? "—"}`}
                                />
                                <DashboardStatRow
                                    label="Score"
                                    value={data.sleep.score ?? "—"}
                                />
                            </>
                        )}
                    </DashboardSectionBox>
                </View>
            ) : null}
        </DashboardCard>
    );
}