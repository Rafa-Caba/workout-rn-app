// src/features/insights/components/InsightsStreaksSection.tsx
// Unified streak summary with independent loading, error, and refresh behavior.

import React from "react";
import { StyleSheet, View } from "react-native";

import type { StreaksResponse } from "@/src/services/workout/insights.service";

import { formatStreakMode, readInsightsErrorMessage } from "../utils/insights.helpers";
import { InsightsMetricCard } from "./InsightsMetricCard";
import { InsightsQueryState } from "./InsightsQueryState";
import { InsightsSectionCard } from "./InsightsSectionCard";

type InsightsStreaksSectionProps = {
    data: StreaksResponse | undefined;
    loading: boolean;
    fetching: boolean;
    error: unknown | null;
    onRefresh: () => void;
};

export function InsightsStreaksSection({
    data,
    loading,
    fetching,
    error,
    onRefresh,
}: InsightsStreaksSectionProps) {
    const subtitle = data
        ? `Hasta ${data.asOf} · ${formatStreakMode(data.mode)}`
        : "Entrenamiento y sueño según los filtros compartidos.";

    return (
        <InsightsSectionCard
            title="Rachas"
            subtitle={subtitle}
            refreshLabel="Recargar rachas"
            refreshing={fetching}
            onRefresh={onRefresh}
        >
            {loading && !data ? (
                <InsightsQueryState kind="loading" title="Cargando rachas…" />
            ) : null}

            {error ? (
                <InsightsQueryState
                    kind="error"
                    title={data ? "No se pudieron actualizar las rachas" : "No se pudieron cargar las rachas"}
                    description={readInsightsErrorMessage(error, "No se pudieron cargar las rachas.")}
                    onRetry={onRefresh}
                />
            ) : null}

            {data ? (
                <View style={styles.metricsGrid}>
                    <InsightsMetricCard label="Racha actual" value={data.currentStreakDays} />
                    <InsightsMetricCard label="Mejor racha" value={data.longestStreakDays} />
                    <InsightsMetricCard label="Margen" value={`${data.gapDays} días`} />
                    <InsightsMetricCard label="Último día" value={data.lastQualifiedDate ?? "—"} />
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
