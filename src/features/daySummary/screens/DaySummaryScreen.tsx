// src/features/daySummary/screens/DaySummaryScreen.tsx

/**
 * DaySummaryScreen
 *
 * Lightweight summary tab for a day:
 * - date
 * - sessions/media counters
 * - quick metrics
 * - notes/tags
 */

import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useDaySummary } from "@/src/hooks/summary/useDaySummary";
import { useTheme } from "@/src/theme/ThemeProvider";
import { minutesToHhMm, secondsToHhMm } from "@/src/utils/dashboard/format";

type Props = {
    date: string;
};

export function DaySummaryScreen({ date }: Props) {
    const { colors } = useTheme();
    const { data, isLoading, isFetching, isError } = useDaySummary(date);

    if (isLoading) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <ActivityIndicator />
                <Text style={[styles.centerText, { color: colors.mutedText }]}>Cargando resumen...</Text>
            </View>
        );
    }

    if (isError || !data) {
        return (
            <View style={[styles.center, { backgroundColor: colors.background }]}>
                <Text style={[styles.centerText, { color: colors.mutedText }]}>No se pudo cargar el resumen.</Text>
            </View>
        );
    }

    const trainingSeconds = data.training.durationSeconds ?? 0;
    const activeKcal = data.training.activeKcal ?? 0;
    const sleepMinutes = data.sleep?.timeAsleepMinutes ?? 0;

    return (
        <View style={styles.container}>
            <View style={[styles.topCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.topTitle, { color: colors.mutedText }]}>📅 Fecha</Text>
                <Text style={[styles.topValue, { color: colors.text }]}>{data.date || "—"}</Text>

                <View style={styles.badgesRow}>
                    <Badge label={`🏋️ Sesiones: ${data.training.sessionsCount}`} colors={colors} />
                    <Badge label={`🖼️ Media: ${data.training.mediaCount}`} colors={colors} />
                    {isFetching ? <Badge label="↻ Actualizando" colors={colors} /> : null}
                </View>
            </View>

            <View style={styles.grid}>
                <View style={styles.metricRow}>
                    <MetricCard title="⏱️ Entrenamiento" value={secondsToHhMm(trainingSeconds)} colors={colors} />
                    <MetricCard title="🔥 Kcal activas" value={activeKcal ? String(activeKcal) : "—"} colors={colors} />
                </View>

                <View style={styles.metricCenterRow}>
                    <MetricCard title="🛌 Sueño" value={minutesToHhMm(sleepMinutes)} colors={colors} />
                </View>
            </View>

            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Notas & Tags</Text>

                <View style={styles.metaRow}>
                    <Text style={[styles.metaLabel, { color: colors.mutedText }]}>📝 Nota</Text>
                    <Text style={[styles.metaValue, { color: colors.text }]} numberOfLines={3}>
                        {data.notes ?? "—"}
                    </Text>
                </View>

                <View style={styles.metaRow}>
                    <Text style={[styles.metaLabel, { color: colors.mutedText }]}>🏷️ Tags</Text>
                    <Text style={[styles.metaValue, { color: colors.text }]} numberOfLines={3}>
                        {Array.isArray(data.tags) && data.tags.length ? data.tags.join(", ") : "—"}
                    </Text>
                </View>
            </View>
        </View>
    );
}

function MetricCard(props: {
    title: string;
    value: string;
    colors: { surface: string; border: string; text: string; mutedText: string };
}) {
    const { title, value, colors } = props;

    return (
        <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.metricTitle, { color: colors.mutedText }]} numberOfLines={1}>
                {title}
            </Text>
            <Text style={[styles.metricValue, { color: colors.text }]} numberOfLines={1}>
                {value}
            </Text>
        </View>
    );
}

function Badge(props: { label: string; colors: { border: string; mutedText: string; surface: string } }) {
    const { label, colors } = props;

    return (
        <View style={[styles.badge, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.badgeText, { color: colors.mutedText }]}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, gap: 12 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
    centerText: { fontSize: 13, fontWeight: "600" },

    topCard: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        gap: 10,
    },
    topTitle: { fontSize: 12, fontWeight: "800" },
    topValue: { fontSize: 16, fontWeight: "800" },
    badgesRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },

    badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
    badgeText: { fontSize: 12, fontWeight: "700" },

    grid: { flexDirection: "column", gap: 10 },
    metricRow: { flexDirection: "row", gap: 10 },
    metricCenterRow: { flexDirection: "row", gap: 10, width: "50%", alignSelf: "center" },

    metricCard: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        minHeight: 78,
        justifyContent: "center",
    },
    metricTitle: { fontSize: 12, fontWeight: "800" },
    metricValue: { marginTop: 6, fontSize: 16, fontWeight: "800" },

    section: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
    sectionTitle: { fontSize: 14, fontWeight: "800" },
    metaRow: { gap: 6 },
    metaLabel: { fontSize: 12, fontWeight: "800" },
    metaValue: { fontSize: 13, fontWeight: "600", lineHeight: 18 },
});