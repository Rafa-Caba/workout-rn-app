// src/features/periods/components/MonthComparisonSection.tsx
// Mobile monthly comparison cards with the exact Web change formulas.

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { CalendarDayFull } from "@/src/types/workoutDay.types";
import type { WeekKpis } from "@/src/utils/summaryPeriods/weeksExplorer";
import {
    buildMonthComparisonGroups,
    type ComparisonMetric,
} from "@/src/features/periods/utils/periods.helpers";

import { PeriodCard } from "./PeriodCard";

type Props = {
    currentLabel: string;
    comparisonLabel: string;
    currentKpis: WeekKpis;
    comparisonKpis: WeekKpis;
    currentDays: readonly CalendarDayFull[];
    comparisonDays: readonly CalendarDayFull[];
    loading: boolean;
    hasError: boolean;
};

function MetricComparisonRow({ metric }: { metric: ComparisonMetric }) {
    const { colors } = useTheme();

    return (
        <View style={[styles.metricRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.metricTitle, { color: colors.text }]}>{metric.label}</Text>
            <View style={styles.values}>
                <Text style={[styles.value, { color: colors.mutedText }]}>{metric.currentLabel}</Text>
                <Text style={[styles.value, { color: colors.mutedText }]}>{metric.comparisonLabel}</Text>
            </View>
            <Text style={[styles.change, { color: colors.text }]}>Cambio: {metric.change}</Text>
        </View>
    );
}

export function MonthComparisonSection(props: Props) {
    const { colors } = useTheme();
    const groups = React.useMemo(
        () => buildMonthComparisonGroups({
            currentLabel: props.currentLabel,
            comparisonLabel: props.comparisonLabel,
            currentKpis: props.currentKpis,
            comparisonKpis: props.comparisonKpis,
            currentDays: props.currentDays,
            comparisonDays: props.comparisonDays,
        }),
        [
            props.comparisonDays,
            props.comparisonKpis,
            props.comparisonLabel,
            props.currentDays,
            props.currentKpis,
            props.currentLabel,
        ],
    );

    return (
        <PeriodCard
            title="Comparación mensual"
            subtitle={`Compara ${props.currentLabel} contra ${props.comparisonLabel}.`}
            tone="accent"
        >
            {props.loading ? (
                <Text style={[styles.message, { color: colors.mutedText }]}>Cargando comparación…</Text>
            ) : null}

            {props.hasError ? (
                <Text style={[styles.message, { color: colors.danger }]}>No se pudo cargar la comparación. Prueba con otro mes.</Text>
            ) : null}

            {!props.loading && !props.hasError ? (
                <View style={styles.sections}>
                    <View style={styles.group}>
                        <Text style={[styles.groupTitle, { color: colors.text }]}>🏋️ Entrenamiento</Text>
                        <View style={styles.rows}>
                            {groups.training.map((metric) => (
                                <MetricComparisonRow key={metric.key} metric={metric} />
                            ))}
                        </View>
                    </View>

                    <View style={styles.group}>
                        <Text style={[styles.groupTitle, { color: colors.text }]}>😴 Sueño</Text>
                        <View style={styles.rows}>
                            {groups.sleep.map((metric) => (
                                <MetricComparisonRow key={metric.key} metric={metric} />
                            ))}
                        </View>
                    </View>
                </View>
            ) : null}
        </PeriodCard>
    );
}

const styles = StyleSheet.create({
    message: {
        fontSize: 13,
        lineHeight: 18,
        fontWeight: "700",
    },
    sections: {
        gap: 16,
    },
    group: {
        gap: 9,
    },
    groupTitle: {
        fontSize: 15,
        fontWeight: "900",
    },
    rows: {
        gap: 8,
    },
    metricRow: {
        borderWidth: 1,
        borderRadius: 14,
        padding: 11,
        gap: 7,
    },
    metricTitle: {
        fontSize: 13,
        fontWeight: "900",
    },
    values: {
        gap: 3,
    },
    value: {
        fontSize: 11,
        lineHeight: 15,
        fontWeight: "700",
    },
    change: {
        fontSize: 12,
        fontWeight: "900",
    },
});
