// src/features/periods/components/PeriodOverview.tsx
// Training and sleep KPI cards fed by the same summary response used by Web.

import React from "react";
import { StyleSheet, View } from "react-native";

import type { WeekKpis } from "@/src/utils/summaryPeriods/weeksExplorer";
import { formatStatValue } from "@/src/features/periods/utils/periods.helpers";

import { MetricTile, PeriodCard } from "./PeriodCard";

type Props = {
    kpis: WeekKpis;
};

export function PeriodOverview({ kpis }: Props) {
    return (
        <View style={styles.stack}>
            <PeriodCard title="🏋️ Entrenamiento" tone="soft">
                <View style={styles.grid}>
                    <MetricTile label="Sesiones" value={formatStatValue(kpis.sessionsCount)} />
                    <MetricTile label="Duración (min)" value={formatStatValue(kpis.durationMinutes)} />
                    <MetricTile label="Kcal activas" value={formatStatValue(kpis.activeKcal)} />
                    <MetricTile label="Media" value={formatStatValue(kpis.mediaCount)} />
                    <MetricTile
                        label="HR prom / máx"
                        value={`${formatStatValue(kpis.avgHr)} / ${formatStatValue(kpis.maxHr)}`}
                        wide
                    />
                </View>
            </PeriodCard>

            <PeriodCard title="😴 Sueño" tone="soft">
                <View style={styles.grid}>
                    <MetricTile label="Días con sueño" value={formatStatValue(kpis.sleepDays)} />
                    <MetricTile label="Sueño avg (min)" value={formatStatValue(kpis.sleepAvgTotal)} />
                    <MetricTile label="Sleep Score" value={formatStatValue(kpis.sleepAvgScore)} />
                    <MetricTile label="REM prom (min)" value={formatStatValue(kpis.sleepAvgRem)} />
                    <MetricTile label="Deep prom (min)" value={formatStatValue(kpis.sleepAvgDeep)} wide />
                </View>
            </PeriodCard>
        </View>
    );
}

const styles = StyleSheet.create({
    stack: {
        gap: 12,
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: 9,
    },
});
