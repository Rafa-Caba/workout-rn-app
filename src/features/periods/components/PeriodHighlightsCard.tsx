// src/features/periods/components/PeriodHighlightsCard.tsx
// Most-active period, best sleep score, and record coverage highlights.

import React from "react";
import { StyleSheet, View } from "react-native";

import type { CalendarDayFull } from "@/src/types/workoutDay.types";
import {
    buildPeriodHighlights,
    type PeriodTab,
} from "@/src/features/periods/utils/periods.helpers";

import { MetricTile, PeriodCard } from "./PeriodCard";

type Props = {
    days: readonly CalendarDayFull[];
    period: PeriodTab;
    periodDaysCount: number;
    loading: boolean;
    hasError: boolean;
};

export function PeriodHighlightsCard({
    days,
    period,
    periodDaysCount,
    loading,
    hasError,
}: Props) {
    const highlights = React.useMemo(
        () => buildPeriodHighlights({
            days,
            period,
            periodDaysCount,
            loading,
            hasError,
        }),
        [days, hasError, loading, period, periodDaysCount],
    );

    const title = period === "month"
        ? "Highlights del mes"
        : period === "range"
            ? "Highlights del rango"
            : "Highlights de la semana";

    return (
        <PeriodCard title={title}>
            <View style={styles.grid}>
                <MetricTile
                    label={period === "month" ? "🔥 Semana más activa" : "🔥 Día más activo"}
                    value={highlights.activeLabel}
                    helper={highlights.activeHelper}
                />
                <MetricTile
                    label="🏆 Mejor Sleep Score"
                    value={highlights.bestSleepLabel}
                    helper={highlights.bestSleepHelper}
                />
                <MetricTile
                    label="📅 Días con registro"
                    value={highlights.daysWithRecordsLabel}
                    helper={hasError ? "Detalle diario no disponible" : "Entrenamiento o sueño"}
                    wide
                />
            </View>
        </PeriodCard>
    );
}

const styles = StyleSheet.create({
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: 9,
    },
});
