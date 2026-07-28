// src/features/periods/screens/PeriodsScreen.tsx
// Period explorer with month, ISO-week, and custom-range parity against Web.

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import {
    addMonths,
    addWeeks,
    differenceInCalendarDays,
    endOfISOWeek,
    format,
    startOfISOWeek,
    subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import React from "react";
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { useRangeSummary } from "@/src/hooks/summary/useRangeSummary";
import { useWeekSummary } from "@/src/hooks/summary/useWeekSummary";
import { useWorkoutCalendar } from "@/src/hooks/workout/useWorkoutCalendar";
import type { GetWorkoutCalendarArgs } from "@/src/services/workout/calendar.service";
import type { GetWorkoutWeekArgs } from "@/src/services/workout/workoutWeek.service";
import { useWorkoutWeekView } from "@/src/hooks/workout/useWorkoutWeekView";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { CalendarDayFull } from "@/src/types/workoutDay.types";
import {
    formatMonthLabel,
    getMonthRange,
} from "@/src/utils/summaryPeriods/monthlySummary";
import { extractWeekKpis } from "@/src/utils/summaryPeriods/weeksExplorer";
import { toWeekKey } from "@/src/utils/weekKey";
import type { PeriodTab } from "@/src/features/periods/utils/periods.helpers";

import { MonthComparisonSection } from "../components/MonthComparisonSection";
import { MonthWeekBreakdownSection } from "../components/MonthWeekBreakdownSection";
import { PeriodCard } from "../components/PeriodCard";
import { PeriodDailyDetailSection } from "../components/PeriodDailyDetailSection";
import { PeriodDatePickerField } from "../components/PeriodDatePickerField";
import { PeriodHighlightsCard } from "../components/PeriodHighlightsCard";
import { PeriodOverview } from "../components/PeriodOverview";
import { PeriodTabs } from "../components/PeriodTabs";
import { SessionTypeSection } from "../components/SessionTypeSection";

type PeriodDetailsQueryOptions = Omit<GetWorkoutCalendarArgs, "from" | "to">
    & Omit<GetWorkoutWeekArgs, "weekKey">;

const DETAILS_QUERY_OPTIONS: PeriodDetailsQueryOptions = {
    fields: null,
    fillMissingDays: true,
    includeRollups: false,
    includeSleep: true,
    includeTraining: true,
    includeSummaries: true,
    includeTotals: false,
    includeTypes: false,
    includeRaw: false,
};

function todayIso(): string {
    return format(new Date(), "yyyy-MM-dd");
}

function parseMonthValue(monthValue: string): Date | null {
    if (!/^\d{4}-\d{2}$/.test(monthValue)) return null;

    const parsed = new Date(`${monthValue}-01T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getInclusiveRangeDaysCount(from: string, to: string): number | null {
    const fromDate = new Date(`${from}T00:00:00`);
    const toDate = new Date(`${to}T00:00:00`);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return null;
    if (toDate.getTime() < fromDate.getTime()) return null;

    return differenceInCalendarDays(toDate, fromDate) + 1;
}

function formatWeekRange(dateIso: string): string {
    const date = new Date(`${dateIso}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateIso;

    const start = format(startOfISOWeek(date), "d MMM yyyy", { locale: es });
    const end = format(endOfISOWeek(date), "d MMM yyyy", { locale: es });
    return `${start} → ${end}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim()) return error.message.trim();
    if (!isRecord(error)) return "No se pudo cargar el periodo.";

    const response = error.response;
    if (!isRecord(response)) return "No se pudo cargar el periodo.";

    const data = response.data;
    if (!isRecord(data)) return "No se pudo cargar el periodo.";

    const errorBody = data.error;
    if (!isRecord(errorBody)) return "No se pudo cargar el periodo.";

    return typeof errorBody.message === "string" && errorBody.message.trim()
        ? errorBody.message.trim()
        : "No se pudo cargar el periodo.";
}

type PeriodButtonProps = {
    label: string;
    icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
    onPress: () => void;
    disabled?: boolean;
};

function PeriodButton({ label, icon, onPress, disabled = false }: PeriodButtonProps) {
    const { colors } = useTheme();

    return (
        <Pressable
            accessibilityRole="button"
            disabled={disabled}
            onPress={onPress}
            style={({ pressed }) => [
                styles.controlButton,
                {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: disabled ? 0.5 : pressed ? 0.84 : 1,
                },
            ]}
        >
            <MaterialCommunityIcons name={icon} size={17} color={colors.text} />
            <Text style={[styles.controlButtonText, { color: colors.text }]}>{label}</Text>
        </Pressable>
    );
}

type QueryStateProps = {
    loading: boolean;
    error: unknown | null;
    empty: boolean;
    onRetry: () => void;
};

function QueryState({ loading, error, empty, onRetry }: QueryStateProps) {
    const { colors } = useTheme();

    if (loading) {
        return (
            <PeriodCard>
                <View style={styles.stateRow}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={[styles.stateText, { color: colors.mutedText }]}>Cargando periodo…</Text>
                </View>
            </PeriodCard>
        );
    }

    if (error) {
        return (
            <PeriodCard title="No se pudo cargar">
                <Text style={[styles.stateText, { color: colors.danger }]}>{readErrorMessage(error)}</Text>
                <PeriodButton label="Reintentar" icon="refresh" onPress={onRetry} />
            </PeriodCard>
        );
    }

    if (empty) {
        return (
            <PeriodCard title="Sin registros">
                <Text style={[styles.stateText, { color: colors.mutedText }]}>Este periodo todavía no tiene entrenamiento ni sueño guardado.</Text>
            </PeriodCard>
        );
    }

    return null;
}

export function PeriodsScreen() {
    const { colors } = useTheme();
    const today = React.useMemo(() => new Date(), []);

    const [tab, setTab] = React.useState<PeriodTab>("week");
    const [monthValue, setMonthValue] = React.useState(() => format(today, "yyyy-MM"));
    const [comparisonMonthValue, setComparisonMonthValue] = React.useState(() => format(subMonths(today, 1), "yyyy-MM"));
    const [weekDate, setWeekDate] = React.useState(() => format(today, "yyyy-MM-dd"));
    const [from, setFrom] = React.useState(() => todayIso());
    const [to, setTo] = React.useState(() => todayIso());

    const monthRange = React.useMemo(() => getMonthRange(monthValue), [monthValue]);
    const comparisonMonthRange = React.useMemo(() => getMonthRange(comparisonMonthValue), [comparisonMonthValue]);
    const weekKey = React.useMemo(() => toWeekKey(new Date(`${weekDate}T00:00:00`)), [weekDate]);
    const rangeDaysCount = React.useMemo(() => getInclusiveRangeDaysCount(from, to), [from, to]);
    const rangeIsValid = rangeDaysCount !== null;

    const monthSummaryQuery = useRangeSummary(
        tab === "month" ? monthRange?.from ?? "" : "",
        tab === "month" ? monthRange?.to ?? "" : "",
    );
    const monthDetailsQuery = useWorkoutCalendar({
        from: tab === "month" ? monthRange?.from ?? "" : "",
        to: tab === "month" ? monthRange?.to ?? "" : "",
        ...DETAILS_QUERY_OPTIONS,
    });

    const comparisonSummaryQuery = useRangeSummary(
        tab === "month" ? comparisonMonthRange?.from ?? "" : "",
        tab === "month" ? comparisonMonthRange?.to ?? "" : "",
    );
    const comparisonDetailsQuery = useWorkoutCalendar({
        from: tab === "month" ? comparisonMonthRange?.from ?? "" : "",
        to: tab === "month" ? comparisonMonthRange?.to ?? "" : "",
        ...DETAILS_QUERY_OPTIONS,
    });

    const weekSummaryQuery = useWeekSummary(tab === "week" ? weekKey : "");
    const weekDetailsQuery = useWorkoutWeekView(
        tab === "week" ? weekKey : null,
        DETAILS_QUERY_OPTIONS,
    );

    const rangeSummaryQuery = useRangeSummary(
        tab === "range" && rangeIsValid ? from : "",
        tab === "range" && rangeIsValid ? to : "",
    );
    const rangeDetailsQuery = useWorkoutCalendar({
        from: tab === "range" && rangeIsValid ? from : "",
        to: tab === "range" && rangeIsValid ? to : "",
        ...DETAILS_QUERY_OPTIONS,
    });

    const currentMonthExtracted = React.useMemo(
        () => extractWeekKpis(monthSummaryQuery.data ?? null),
        [monthSummaryQuery.data],
    );
    const comparisonMonthExtracted = React.useMemo(
        () => extractWeekKpis(comparisonSummaryQuery.data ?? null),
        [comparisonSummaryQuery.data],
    );
    const weekExtracted = React.useMemo(
        () => extractWeekKpis(weekSummaryQuery.data ?? null),
        [weekSummaryQuery.data],
    );
    const rangeExtracted = React.useMemo(
        () => extractWeekKpis(rangeSummaryQuery.data ?? null),
        [rangeSummaryQuery.data],
    );

    const currentMonthDays = monthDetailsQuery.data?.days ?? [];
    const comparisonMonthDays = comparisonDetailsQuery.data?.days ?? [];
    const weekDays = weekDetailsQuery.data?.days ?? [];
    const rangeDays = rangeDetailsQuery.data?.days ?? [];

    const isRefreshing = tab === "month"
        ? monthSummaryQuery.isRefetching || monthDetailsQuery.isRefetching || comparisonSummaryQuery.isRefetching || comparisonDetailsQuery.isRefetching
        : tab === "week"
            ? weekSummaryQuery.isRefetching || weekDetailsQuery.isRefetching
            : rangeSummaryQuery.isRefetching || rangeDetailsQuery.isRefetching;

    const refetchMonthSummary = monthSummaryQuery.refetch;
    const refetchMonthDetails = monthDetailsQuery.refetch;
    const refetchComparisonSummary = comparisonSummaryQuery.refetch;
    const refetchComparisonDetails = comparisonDetailsQuery.refetch;
    const refetchWeekSummary = weekSummaryQuery.refetch;
    const refetchWeekDetails = weekDetailsQuery.refetch;
    const refetchRangeSummary = rangeSummaryQuery.refetch;
    const refetchRangeDetails = rangeDetailsQuery.refetch;

    const refreshCurrent = React.useCallback(async (): Promise<void> => {
        if (tab === "month") {
            await Promise.all([
                refetchMonthSummary(),
                refetchMonthDetails(),
                refetchComparisonSummary(),
                refetchComparisonDetails(),
            ]);
            return;
        }

        if (tab === "week") {
            await Promise.all([
                refetchWeekSummary(),
                refetchWeekDetails(),
            ]);
            return;
        }

        if (!rangeIsValid) return;
        await Promise.all([
            refetchRangeSummary(),
            refetchRangeDetails(),
        ]);
    }, [
        rangeIsValid,
        refetchComparisonDetails,
        refetchComparisonSummary,
        refetchMonthDetails,
        refetchMonthSummary,
        refetchRangeDetails,
        refetchRangeSummary,
        refetchWeekDetails,
        refetchWeekSummary,
        tab,
    ]);

    useFocusEffect(
        React.useCallback(() => {
            void refreshCurrent();
        }, [refreshCurrent]),
    );

    function updateSelectedMonth(nextMonth: string): void {
        const parsed = parseMonthValue(nextMonth);
        if (!parsed) return;

        setMonthValue(nextMonth);
        setComparisonMonthValue(format(subMonths(parsed, 1), "yyyy-MM"));
    }

    function moveMonth(amount: number): void {
        const parsed = parseMonthValue(monthValue);
        if (!parsed) return;
        updateSelectedMonth(format(addMonths(parsed, amount), "yyyy-MM"));
    }

    function moveWeek(amount: number): void {
        const parsed = new Date(`${weekDate}T00:00:00`);
        if (Number.isNaN(parsed.getTime())) return;
        setWeekDate(format(addWeeks(parsed, amount), "yyyy-MM-dd"));
    }

    const monthLoading = monthSummaryQuery.isLoading || monthDetailsQuery.isLoading;
    const monthError = monthSummaryQuery.error ?? monthDetailsQuery.error ?? null;
    const monthEmpty = monthSummaryQuery.isSuccess && monthSummaryQuery.data.daysCount === 0;

    const weekLoading = weekSummaryQuery.isLoading || weekDetailsQuery.isLoading;
    const weekError = weekSummaryQuery.error ?? weekDetailsQuery.error ?? null;
    const weekEmpty = weekSummaryQuery.isSuccess && weekSummaryQuery.data.daysCount === 0;

    const rangeLoading = rangeSummaryQuery.isLoading || rangeDetailsQuery.isLoading;
    const rangeError = rangeSummaryQuery.error ?? rangeDetailsQuery.error ?? null;
    const rangeEmpty = rangeSummaryQuery.isSuccess && rangeSummaryQuery.data.daysCount === 0;

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={(
                <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={() => void refreshCurrent()}
                    tintColor={colors.primary}
                />
            )}
        >
            <View style={styles.hero}>
                <Text style={[styles.title, { color: colors.text }]}>Periodos</Text>
                <Text style={[styles.subtitle, { color: colors.mutedText }]}>Revisa meses, semanas o rangos con los mismos datos del explorador Web.</Text>
            </View>

            <PeriodTabs value={tab} onChange={setTab} />

            {tab === "month" ? (
                <PeriodCard title="Selecciona meses">
                    <View style={styles.fieldRow}>
                        <PeriodDatePickerField
                            label="Mes"
                            value={monthValue}
                            mode="month"
                            onChange={updateSelectedMonth}
                        />
                        <PeriodDatePickerField
                            label="Comparar con"
                            value={comparisonMonthValue}
                            mode="month"
                            onChange={setComparisonMonthValue}
                        />
                    </View>
                    <View style={styles.buttonRow}>
                        <PeriodButton label="Mes anterior" icon="chevron-left" onPress={() => moveMonth(-1)} disabled={monthLoading} />
                        <PeriodButton label="Mes siguiente" icon="chevron-right" onPress={() => moveMonth(1)} disabled={monthLoading} />
                    </View>
                    <Text style={[styles.loadedLabel, { color: colors.mutedText }]}>
                        {formatMonthLabel(monthValue, "es")} vs {formatMonthLabel(comparisonMonthValue, "es")}
                    </Text>
                </PeriodCard>
            ) : null}

            {tab === "week" ? (
                <PeriodCard title="Semana seleccionada">
                    <PeriodDatePickerField
                        label="Fecha dentro de la semana"
                        value={weekDate}
                        onChange={setWeekDate}
                    />
                    <View style={styles.buttonRow}>
                        <PeriodButton label="Anterior" icon="chevron-left" onPress={() => moveWeek(-1)} disabled={weekLoading} />
                        <PeriodButton label="Siguiente" icon="chevron-right" onPress={() => moveWeek(1)} disabled={weekLoading} />
                    </View>
                    <View style={styles.loadedStack}>
                        <Text style={[styles.loadedLabel, { color: colors.text }]}>Clave: {weekKey}</Text>
                        <Text style={[styles.loadedLabel, { color: colors.mutedText }]}>{formatWeekRange(weekDate)}</Text>
                    </View>
                </PeriodCard>
            ) : null}

            {tab === "range" ? (
                <PeriodCard title="Rango de fechas">
                    <View style={styles.fieldRow}>
                        <PeriodDatePickerField label="Desde" value={from} onChange={setFrom} />
                        <PeriodDatePickerField label="Hasta" value={to} onChange={setTo} />
                    </View>
                    {!rangeIsValid ? (
                        <Text style={[styles.validation, { color: colors.danger }]}>La fecha final no puede ser anterior a la inicial.</Text>
                    ) : (
                        <Text style={[styles.loadedLabel, { color: colors.mutedText }]}>Cargado: {from} → {to} · {rangeDaysCount} día(s)</Text>
                    )}
                </PeriodCard>
            ) : null}

            {tab === "month" ? (
                <>
                    <QueryState
                        loading={monthLoading}
                        error={monthError}
                        empty={monthEmpty}
                        onRetry={() => void refreshCurrent()}
                    />

                    {!monthLoading && !monthError && !monthEmpty && monthSummaryQuery.data ? (
                        <View style={styles.sections}>
                            <PeriodOverview kpis={currentMonthExtracted.kpis} />
                            <PeriodHighlightsCard
                                days={currentMonthDays}
                                period="month"
                                periodDaysCount={monthRange?.daysCount ?? currentMonthDays.length}
                                loading={monthDetailsQuery.isLoading}
                                hasError={monthDetailsQuery.isError}
                            />
                            <MonthComparisonSection
                                currentLabel={formatMonthLabel(monthValue, "es")}
                                comparisonLabel={formatMonthLabel(comparisonMonthValue, "es")}
                                currentKpis={currentMonthExtracted.kpis}
                                comparisonKpis={comparisonMonthExtracted.kpis}
                                currentDays={currentMonthDays}
                                comparisonDays={comparisonMonthDays}
                                loading={comparisonSummaryQuery.isFetching || comparisonDetailsQuery.isFetching}
                                hasError={comparisonSummaryQuery.isError || comparisonDetailsQuery.isError}
                            />
                            <MonthWeekBreakdownSection
                                days={currentMonthDays}
                                loading={monthDetailsQuery.isLoading}
                                hasError={monthDetailsQuery.isError}
                            />
                            <SessionTypeSection rows={currentMonthExtracted.bySessionType} />
                        </View>
                    ) : null}
                </>
            ) : null}

            {tab === "week" ? (
                <>
                    <QueryState
                        loading={weekLoading}
                        error={weekError}
                        empty={weekEmpty}
                        onRetry={() => void refreshCurrent()}
                    />

                    {!weekLoading && !weekError && !weekEmpty && weekSummaryQuery.data ? (
                        <View style={styles.sections}>
                            <PeriodOverview kpis={weekExtracted.kpis} />
                            <PeriodHighlightsCard
                                days={weekDays}
                                period="week"
                                periodDaysCount={7}
                                loading={weekDetailsQuery.isLoading}
                                hasError={weekDetailsQuery.isError}
                            />
                            <PeriodDailyDetailSection
                                days={weekDays}
                                loading={weekDetailsQuery.isLoading}
                                hasError={weekDetailsQuery.isError}
                                period="week"
                            />
                            <SessionTypeSection rows={weekExtracted.bySessionType} />
                        </View>
                    ) : null}
                </>
            ) : null}

            {tab === "range" && rangeIsValid ? (
                <>
                    <QueryState
                        loading={rangeLoading}
                        error={rangeError}
                        empty={rangeEmpty}
                        onRetry={() => void refreshCurrent()}
                    />

                    {!rangeLoading && !rangeError && !rangeEmpty && rangeSummaryQuery.data ? (
                        <View style={styles.sections}>
                            <PeriodOverview kpis={rangeExtracted.kpis} />
                            <PeriodHighlightsCard
                                days={rangeDays}
                                period="range"
                                periodDaysCount={rangeDaysCount ?? rangeDays.length}
                                loading={rangeDetailsQuery.isLoading}
                                hasError={rangeDetailsQuery.isError}
                            />
                            <PeriodDailyDetailSection
                                days={rangeDays}
                                loading={rangeDetailsQuery.isLoading}
                                hasError={rangeDetailsQuery.isError}
                                period="range"
                            />
                            <SessionTypeSection rows={rangeExtracted.bySessionType} />
                        </View>
                    ) : null}
                </>
            ) : null}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 14,
        paddingBottom: 38,
        gap: 12,
    },
    hero: {
        gap: 4,
    },
    title: {
        fontSize: 25,
        fontWeight: "900",
    },
    subtitle: {
        fontSize: 13,
        lineHeight: 18,
        fontWeight: "700",
    },
    sections: {
        gap: 12,
    },
    fieldRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    buttonRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    controlButton: {
        minHeight: 42,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
    },
    controlButtonText: {
        fontSize: 12,
        fontWeight: "900",
    },
    loadedStack: {
        gap: 2,
    },
    loadedLabel: {
        fontSize: 12,
        lineHeight: 17,
        fontWeight: "800",
    },
    validation: {
        fontSize: 12,
        lineHeight: 17,
        fontWeight: "800",
    },
    stateRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    stateText: {
        fontSize: 13,
        lineHeight: 18,
        fontWeight: "700",
    },
});
