// src/features/healthBackfill/screens/HealthBackfillScreen.tsx
// Main themed Health Backfill screen with app-standard toast helpers.

import { eachDayOfInterval, format, isValid, parseISO } from "date-fns";
import * as React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { HealthBackfillRangeSection } from "@/src/features/healthBackfill/components/HealthBackfillRangeSection";
import {
    HealthBackfillResultsSection,
    type HealthBackfillUiResult,
} from "@/src/features/healthBackfill/components/HealthBackfillResultsSection";
import { HealthBackfillSingleDateSection } from "@/src/features/healthBackfill/components/HealthBackfillSingleDateSection";
import { useBackfillRange } from "@/src/hooks/health/useBackfillRange";
import { useBackfillSingleDate } from "@/src/hooks/health/useBackfillSingleDate";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { UpsertMode } from "@/src/types/workoutDay.types";
import { toastError, toastInfo, toastSuccess } from "@/src/utils/toast";

function todayIso(): string {
    return format(new Date(), "yyyy-MM-dd");
}

function isIsoDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const parsed = parseISO(value);
    return isValid(parsed);
}

function buildDatesInRange(from: string, to: string): string[] {
    if (!isIsoDate(from) || !isIsoDate(to)) {
        return [];
    }

    const start = parseISO(from);
    const end = parseISO(to);

    if (!isValid(start) || !isValid(end) || start > end) {
        return [];
    }

    return eachDayOfInterval({ start, end }).map((date) => format(date, "yyyy-MM-dd"));
}

export function HealthBackfillScreen() {
    const { colors } = useTheme();

    const [singleDate, setSingleDate] = React.useState<string>(todayIso());
    const [singleMode, setSingleMode] = React.useState<UpsertMode>("merge");

    const [rangeFrom, setRangeFrom] = React.useState<string>(todayIso());
    const [rangeTo, setRangeTo] = React.useState<string>(todayIso());
    const [rangeMode, setRangeMode] = React.useState<UpsertMode>("merge");

    const [result, setResult] = React.useState<HealthBackfillUiResult>(null);

    const singleBackfill = useBackfillSingleDate();
    const rangeBackfill = useBackfillRange();

    const previewDates = React.useMemo(
        () => buildDatesInRange(rangeFrom, rangeTo),
        [rangeFrom, rangeTo]
    );

    const handleSingleBackfill = React.useCallback(async () => {
        if (!isIsoDate(singleDate)) {
            toastError("Fecha inválida", "Usa formato YYYY-MM-DD.");
            return;
        }

        try {
            const day = await singleBackfill.mutateAsync({
                date: singleDate,
                mode: singleMode,
            });

            setResult({
                kind: "single",
                date: singleDate,
                mode: singleMode,
                day,
                message: day
                    ? "Se procesó el día correctamente."
                    : "No se encontraron datos importables para esa fecha.",
            });

            if (day) {
                toastSuccess(
                    "Backfill completado",
                    `Se procesó correctamente el día ${singleDate}.`
                );
            } else {
                toastInfo(
                    "Sin datos importables",
                    `No hubo datos disponibles para ${singleDate}.`
                );
            }
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "No se pudo completar el backfill del día.";

            toastError("Error en backfill", message);
        }
    }, [singleBackfill, singleDate, singleMode]);

    const handleRangeBackfill = React.useCallback(async () => {
        if (!previewDates.length) {
            toastError("Rango inválido", "Revisa las fechas en formato YYYY-MM-DD.");
            return;
        }

        try {
            const rangeResult = await rangeBackfill.mutateAsync({
                dates: previewDates,
                mode: rangeMode,
            });

            setResult({
                kind: "range",
                mode: rangeMode,
                result: rangeResult,
                message: rangeResult
                    ? "Se procesó el rango correctamente."
                    : "No se encontraron datos importables para el rango seleccionado.",
            });

            if (rangeResult) {
                toastSuccess(
                    "Backfill de rango completado",
                    `Procesados: ${rangeResult.total} | Éxitos: ${rangeResult.successCount} | Fallidos: ${rangeResult.failedCount}`
                );
            } else {
                toastInfo(
                    "Sin datos importables",
                    "No hubo datos disponibles para el rango seleccionado."
                );
            }
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "No se pudo completar el backfill del rango.";

            toastError("Error en backfill de rango", message);
        }
    }, [previewDates, rangeBackfill, rangeMode]);

    return (
        <ScrollView
            style={[styles.screen, { backgroundColor: colors.background }]}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
        >
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Health Backfill</Text>
                <Text style={[styles.subtitle, { color: colors.mutedText }]}>
                    Importa histórico de sueño y sesiones mínimas automáticas desde HealthKit /
                    Health Connect sin mezclarlo con los flows diarios de GymCheck, Sleep o Día.
                </Text>
            </View>

            <HealthBackfillSingleDateSection
                date={singleDate}
                mode={singleMode}
                isPending={singleBackfill.isPending}
                onDateChange={setSingleDate}
                onModeChange={setSingleMode}
                onSubmit={handleSingleBackfill}
                colors={colors}
            />

            <HealthBackfillRangeSection
                from={rangeFrom}
                to={rangeTo}
                mode={rangeMode}
                previewCount={previewDates.length}
                isPending={rangeBackfill.isPending}
                onFromChange={setRangeFrom}
                onToChange={setRangeTo}
                onModeChange={setRangeMode}
                onSubmit={handleRangeBackfill}
                colors={colors}
            />

            <HealthBackfillResultsSection result={result} colors={colors} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    content: {
        padding: 16,
        gap: 16,
        paddingBottom: 32,
    },
    header: {
        gap: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: "900",
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 22,
    },
});