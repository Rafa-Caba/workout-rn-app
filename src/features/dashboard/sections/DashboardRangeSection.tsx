// /src/features/dashboard/sections/DashboardRangeSection.tsx

import React from "react";
import { View } from "react-native";

import DashboardCard from "@/src/features/dashboard/components/DashboardCard";
import DashboardSectionBox from "@/src/features/dashboard/components/DashboardSectionBox";
import DashboardStatRow from "@/src/features/dashboard/components/DashboardStatRow";
import { minutesToHhMm, secondsToHhMm } from "@/src/utils/dashboard/format";

type RangeTraining = {
    sessionsCount: number;
    durationSeconds: number;
    activeKcal: number | null;
    avgHr: number | null;
    maxHr: number | null;
    mediaCount: number;
} | null;

type RangeSleep = {
    daysWithSleep: number;
    avgTotalMinutes: number | null;
    avgDeepMinutes: number | null;
    avgRemMinutes: number | null;
    avgScore: number | null;
} | null;

type Props = {
    from: string;
    to: string;
    training: RangeTraining;
    sleep: RangeSleep;
};

export default function DashboardRangeSection({
    from,
    to,
    training,
    sleep,
}: Props) {
    return (
        <DashboardCard title="Últimos 7 días" subtitle={`${from} → ${to}`}>
            <View style={{ gap: 10 }}>
                <DashboardSectionBox title="Entrenamiento">
                    <DashboardStatRow
                        label="Sesiones"
                        value={training?.sessionsCount ?? 0}
                    />
                    <DashboardStatRow
                        label="Duración"
                        value={secondsToHhMm(training?.durationSeconds ?? 0)}
                    />
                    <DashboardStatRow
                        label="Kcal activas"
                        value={training?.activeKcal ?? "—"}
                    />
                    <DashboardStatRow
                        label="HR avg / max"
                        value={`${training?.avgHr ?? "—"} / ${training?.maxHr ?? "—"}`}
                    />
                    <DashboardStatRow
                        label="Media"
                        value={training?.mediaCount ?? 0}
                    />
                </DashboardSectionBox>

                <DashboardSectionBox title="Sueño">
                    <DashboardStatRow
                        label="Días con sueño"
                        value={sleep?.daysWithSleep ?? 0}
                    />
                    <DashboardStatRow
                        label="Promedio total"
                        value={
                            sleep?.avgTotalMinutes
                                ? minutesToHhMm(sleep.avgTotalMinutes)
                                : "—"
                        }
                    />
                    <DashboardStatRow
                        label="Promedio Deep (min)"
                        value={sleep?.avgDeepMinutes ?? "—"}
                    />
                    <DashboardStatRow
                        label="Promedio REM (min)"
                        value={sleep?.avgRemMinutes ?? "—"}
                    />
                    <DashboardStatRow
                        label="Promedio score"
                        value={sleep?.avgScore ?? "—"}
                    />
                </DashboardSectionBox>
            </View>
        </DashboardCard>
    );
}