// /src/features/daySummary/screens/DayDetailScreen.tsx

/**
 * Unified day detail entry.
 *
 * The former Resumen / Día tabs were removed. The screen now exposes one
 * scrollable detail with KPIs, notes, sleep, Gym, and Cardio in a single flow.
 */

import { format } from "date-fns";
import { es } from "date-fns/locale";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

import { DayTrainingSessionSleepDetailsScreen } from "./DayTrainingSessionSleepDetailsScreen";

type Props = {
    date: string;
};

function safeParseIsoDate(isoDate: string): Date | null {
    if (!isoDate) return null;

    const parsed = new Date(`${isoDate}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function capitalizeFirst(value: string): string {
    if (!value) return value;
    return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function formatDayHeader(isoDate: string): string {
    const parsed = safeParseIsoDate(isoDate);
    if (!parsed) return isoDate || "—";

    return capitalizeFirst(
        format(parsed, "EEE, d 'de' MMMM 'de' yyyy", { locale: es })
    );
}

export function DayDetailScreen({ date }: Props) {
    const { colors } = useTheme();
    const label = React.useMemo(() => formatDayHeader(date), [date]);

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <Text style={[styles.title, { color: colors.text }]}>Detalle del día</Text>
                <Text style={[styles.subtitle, { color: colors.mutedText }]}>{label}</Text>
            </View>

            <View style={styles.body}>
                <DayTrainingSessionSleepDetailsScreen date={date} />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        paddingBottom: 34,
    },
    header: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 13,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: 3,
    },
    title: {
        fontSize: 22,
        fontWeight: "900",
    },
    subtitle: {
        fontSize: 13,
        fontWeight: "700",
        lineHeight: 18,
    },
    body: {
        padding: 16,
    },
});
