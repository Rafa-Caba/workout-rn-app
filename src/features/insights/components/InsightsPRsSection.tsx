// src/features/insights/components/InsightsPRsSection.tsx
// Mobile-first top-eight personal-record list using the same values as Web.

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { PrRecord, PrsResponse } from "@/src/services/workout/insights.service";
import { useTheme } from "@/src/theme/ThemeProvider";

import {
    formatMetricLabel,
    formatMetricValue,
    readInsightsErrorMessage,
} from "../utils/insights.helpers";
import { InsightsQueryState } from "./InsightsQueryState";
import { InsightsSectionCard } from "./InsightsSectionCard";

type InsightsPRsSectionProps = {
    data: PrsResponse | undefined;
    loading: boolean;
    fetching: boolean;
    error: unknown | null;
    rangeValidationMessage: string | null;
    onRefresh: () => void;
};

type PersonalRecordCardProps = {
    record: PrRecord;
};

function PersonalRecordCard({ record }: PersonalRecordCardProps) {
    const { colors } = useTheme();

    return (
        <View style={[styles.recordCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.recordHeader}>
                <Text style={[styles.sessionType, { color: colors.text }]} numberOfLines={1}>
                    {record.sessionType || "—"}
                </Text>
                <Text style={[styles.recordDate, { color: colors.mutedText }]}>{record.date}</Text>
            </View>

            <Text style={[styles.metricLabel, { color: colors.mutedText }]}>
                {formatMetricLabel(record.metric, record.mode)}
            </Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>
                {formatMetricValue(record.metric, record.value)}
            </Text>
        </View>
    );
}

export function InsightsPRsSection({
    data,
    loading,
    fetching,
    error,
    rangeValidationMessage,
    onRefresh,
}: InsightsPRsSectionProps) {
    const topRecords = (data?.prs ?? []).slice(0, 8);
    const subtitle = data
        ? `${data.range.from} → ${data.range.to}`
        : "Mejores marcas del rango compartido.";

    return (
        <InsightsSectionCard
            title="PRs"
            subtitle={subtitle}
            refreshLabel="Recargar PRs"
            refreshing={fetching}
            refreshDisabled={Boolean(rangeValidationMessage)}
            onRefresh={onRefresh}
            badgeLabel={`${topRecords.length} PRs`}
        >
            {rangeValidationMessage ? (
                <InsightsQueryState
                    kind="empty"
                    title="Rango inválido"
                    description={rangeValidationMessage}
                />
            ) : null}

            {!rangeValidationMessage && loading && !data ? (
                <InsightsQueryState kind="loading" title="Cargando PRs…" />
            ) : null}

            {!rangeValidationMessage && error ? (
                <InsightsQueryState
                    kind="error"
                    title={data ? "No se pudieron actualizar los PRs" : "No se pudieron cargar los PRs"}
                    description={readInsightsErrorMessage(error, "No se pudieron cargar los PRs.")}
                    onRetry={onRefresh}
                />
            ) : null}

            {!rangeValidationMessage && data && topRecords.length === 0 ? (
                <InsightsQueryState
                    kind="empty"
                    title="Sin PRs todavía"
                    description="Cuando existan sesiones comparables, aparecerán aquí."
                />
            ) : null}

            {!rangeValidationMessage && topRecords.length > 0 ? (
                <View style={styles.recordsList}>
                    {topRecords.map((record, index) => (
                        <PersonalRecordCard
                            key={`${record.sessionId}-${record.metric}-${record.mode}-${index}`}
                            record={record}
                        />
                    ))}
                </View>
            ) : null}
        </InsightsSectionCard>
    );
}

const styles = StyleSheet.create({
    recordsList: {
        gap: 9,
    },
    recordCard: {
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
        gap: 5,
    },
    recordHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },
    sessionType: {
        flex: 1,
        fontSize: 14,
        fontWeight: "900",
    },
    recordDate: {
        fontSize: 11,
        fontWeight: "800",
    },
    metricLabel: {
        fontSize: 12,
        fontWeight: "700",
        lineHeight: 17,
    },
    metricValue: {
        fontSize: 18,
        fontWeight: "900",
    },
});
