// src/features/insights/components/InsightsRecoverySection.tsx
// Recovery summary that matches Web calculations for the shared date range.

import React from "react";
import { StyleSheet, View } from "react-native";

import type { RecoveryResponse } from "@/src/services/workout/insights.service";

import {
    averageNumbers,
    formatFiniteNumber,
    formatMinutes,
    formatRecoveryLevel,
    getLatestRecoveryLevel,
    readInsightsErrorMessage,
} from "../utils/insights.helpers";
import { InsightsMetricCard } from "./InsightsMetricCard";
import { InsightsQueryState } from "./InsightsQueryState";
import { InsightsSectionCard } from "./InsightsSectionCard";

type InsightsRecoverySectionProps = {
    data: RecoveryResponse | undefined;
    loading: boolean;
    fetching: boolean;
    error: unknown | null;
    rangeValidationMessage: string | null;
    onRefresh: () => void;
};

export function InsightsRecoverySection({
    data,
    loading,
    fetching,
    error,
    rangeValidationMessage,
    onRefresh,
}: InsightsRecoverySectionProps) {
    const points = data?.points ?? [];
    const latestLevel = getLatestRecoveryLevel(points);
    const subtitle = data
        ? `${data.range.from} → ${data.range.to}`
        : "Resumen rápido del rango compartido.";

    const recoveryScoreAverage = averageNumbers(points.map((point) => point.recoveryScore));
    const sleepScoreAverage = averageNumbers(points.map((point) => point.sleepScore));
    const totalSleepAverage = averageNumbers(points.map((point) => point.totalSleepMinutes));
    const trainingLoadAverage = averageNumbers(points.map((point) => point.trainingLoad));

    return (
        <InsightsSectionCard
            title="Recuperación"
            subtitle={subtitle}
            refreshLabel="Recargar recuperación"
            refreshing={fetching}
            refreshDisabled={Boolean(rangeValidationMessage)}
            onRefresh={onRefresh}
            badgeLabel={formatRecoveryLevel(latestLevel)}
        >
            {rangeValidationMessage ? (
                <InsightsQueryState
                    kind="empty"
                    title="Rango inválido"
                    description={rangeValidationMessage}
                />
            ) : null}

            {!rangeValidationMessage && loading && !data ? (
                <InsightsQueryState kind="loading" title="Cargando recuperación…" />
            ) : null}

            {!rangeValidationMessage && error ? (
                <InsightsQueryState
                    kind="error"
                    title={data ? "No se pudo actualizar la recuperación" : "No se pudo cargar la recuperación"}
                    description={readInsightsErrorMessage(error, "No se pudo cargar la recuperación.")}
                    onRetry={onRefresh}
                />
            ) : null}

            {!rangeValidationMessage && data && points.length === 0 ? (
                <InsightsQueryState
                    kind="empty"
                    title="Sin datos de recuperación"
                    description="No hay puntos de recuperación para este rango."
                />
            ) : null}

            {!rangeValidationMessage && points.length > 0 ? (
                <View style={styles.metricsGrid}>
                    <InsightsMetricCard
                        label="Recovery promedio"
                        value={formatFiniteNumber(recoveryScoreAverage, 1)}
                    />
                    <InsightsMetricCard
                        label="Sleep Score promedio"
                        value={formatFiniteNumber(sleepScoreAverage, 1)}
                    />
                    <InsightsMetricCard
                        label="Sueño promedio"
                        value={formatMinutes(totalSleepAverage)}
                    />
                    <InsightsMetricCard
                        label="Carga promedio"
                        value={formatFiniteNumber(trainingLoadAverage, 1)}
                    />
                </View>
            ) : null}
        </InsightsSectionCard>
    );
}

const styles = StyleSheet.create({
    metricsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: 8,
    },
});
