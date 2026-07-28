// src/features/periods/utils/periods.helpers.ts
// Mobile presentation helpers that preserve the same formulas used by Web periods.

import type { CalendarDayFull, WorkoutSession } from "@/src/types/workoutDay.types";
import { calcSleepEfficiencyPct } from "@/src/utils/dayExplorer";
import {
    buildMonthWeekRows,
    countTrainingDays,
    type MonthWeekRow,
} from "@/src/utils/summaryPeriods/monthlySummary";
import {
    buildTrainingDayRows,
    formatWeekDayLabel,
    type TrainingDayRow,
} from "@/src/utils/summaryPeriods/weeklySummary";
import type {
    WeekBySessionTypeRow,
    WeekKpis,
} from "@/src/utils/summaryPeriods/weeksExplorer";

export type PeriodTab = "month" | "week" | "range";
export type PeriodDetailTab = "training" | "sleep";
export type NumberOrDash = number | "—";

export type PeriodHighlight = {
    activeLabel: string;
    activeHelper: string | null;
    bestSleepLabel: string;
    bestSleepHelper: string | null;
    daysWithRecordsLabel: string;
};

export type SleepDayRow = {
    date: string;
    totalMinutes: number | null;
    score: number | null;
    efficiencyPct: number | null;
    readiness: number | null;
    remPct: number | null;
    deepPct: number | null;
    coreMinutes: number | null;
    awakeMinutes: number | null;
    source: string | null;
    sourceDevice: string | null;
};

export type ComparisonMetric = {
    key: string;
    label: string;
    current: NumberOrDash;
    comparison: NumberOrDash;
    currentLabel: string;
    comparisonLabel: string;
    change: string;
};

export type MonthComparisonGroups = {
    training: ComparisonMetric[];
    sleep: ComparisonMetric[];
};

export function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

export function formatStatValue(value: NumberOrDash | undefined): string {
    if (typeof value === "number" && Number.isFinite(value)) {
        return Number(value.toFixed(2)).toString();
    }

    return "—";
}

export function formatMinutes(value: number | null | NumberOrDash): string {
    if (!isFiniteNumber(value) || value <= 0) return "—";

    const rounded = Math.round(value);
    const hours = Math.floor(rounded / 60);
    const minutes = rounded % 60;

    return hours > 0 ? `${hours}h ${minutes}m` : `${rounded} min`;
}

export function formatDurationSeconds(value: number | null): string {
    if (!isFiniteNumber(value) || value <= 0) return "—";
    return formatMinutes(Math.round(value / 60));
}

export function formatRounded(value: number | null): string {
    return isFiniteNumber(value) ? String(Math.round(value)) : "—";
}

export function formatHr(avgHr: number | null, maxHr: number | null): string {
    if (!isFiniteNumber(avgHr) && !isFiniteNumber(maxHr)) return "—";
    return `${formatRounded(avgHr)} / ${formatRounded(maxHr)}`;
}

function compareActivity(a: TrainingDayRow, b: TrainingDayRow): number {
    const kcalDifference = (a.activeKcal ?? -1) - (b.activeKcal ?? -1);
    if (kcalDifference !== 0) return kcalDifference;

    const durationDifference = (a.durationSeconds ?? -1) - (b.durationSeconds ?? -1);
    if (durationDifference !== 0) return durationDifference;

    return a.sessionsCount - b.sessionsCount;
}

function compareWeekActivity(a: MonthWeekRow, b: MonthWeekRow): number {
    const kcalDifference = (a.activeKcal ?? -1) - (b.activeKcal ?? -1);
    if (kcalDifference !== 0) return kcalDifference;

    const durationDifference = (a.durationSeconds ?? -1) - (b.durationSeconds ?? -1);
    if (durationDifference !== 0) return durationDifference;

    return a.sessionsCount - b.sessionsCount;
}

function buildActivityHelper(
    activeKcal: number | null,
    durationSeconds: number | null,
): string | null {
    const values = [
        isFiniteNumber(activeKcal) ? `${Math.round(activeKcal)} kcal` : null,
        formatDurationSeconds(durationSeconds) !== "—" ? formatDurationSeconds(durationSeconds) : null,
    ].filter((value): value is string => Boolean(value));

    return values.length > 0 ? values.join(" · ") : null;
}

export function buildPeriodHighlights(args: {
    days: readonly CalendarDayFull[];
    period: PeriodTab;
    periodDaysCount: number;
    loading: boolean;
    hasError: boolean;
}): PeriodHighlight {
    const { days, period, periodDaysCount, loading, hasError } = args;
    const trainingRows = buildTrainingDayRows(days);
    const monthRows = buildMonthWeekRows(days, "es").filter((row) => row.sessionsCount > 0);

    const mostActiveDay = trainingRows.length > 0
        ? trainingRows.reduce((best, current) => (
            compareActivity(current, best) > 0 ? current : best
        ))
        : null;

    const mostActiveWeek = monthRows.length > 0
        ? monthRows.reduce((best, current) => (
            compareWeekActivity(current, best) > 0 ? current : best
        ))
        : null;

    const sleepScores = days.flatMap((day) => {
        const score = day.sleep?.score ?? day.sleepSummary?.score ?? null;
        if (!isFiniteNumber(score)) return [];

        return [{ date: day.date ?? "—", score }];
    });

    const bestSleep = sleepScores.length > 0
        ? sleepScores.reduce((best, current) => current.score > best.score ? current : best)
        : null;

    const daysWithRecords = days.filter((day) => {
        const hasSleep = Boolean(day.sleep || day.sleepSummary);
        const sessionsCount = Array.isArray(day.training?.sessions)
            ? day.training.sessions.length
            : day.trainingSummary?.sessionsCount ?? 0;

        return hasSleep || sessionsCount > 0;
    }).length;

    const fallback = loading ? "…" : "—";
    const activeLabel = period === "month"
        ? mostActiveWeek?.label ?? fallback
        : mostActiveDay
            ? formatWeekDayLabel(mostActiveDay.date, "es")
            : fallback;

    const activeHelper = period === "month"
        ? buildActivityHelper(mostActiveWeek?.activeKcal ?? null, mostActiveWeek?.durationSeconds ?? null)
        : buildActivityHelper(mostActiveDay?.activeKcal ?? null, mostActiveDay?.durationSeconds ?? null);

    return {
        activeLabel,
        activeHelper,
        bestSleepLabel: bestSleep ? formatWeekDayLabel(bestSleep.date, "es") : fallback,
        bestSleepHelper: bestSleep ? String(Math.round(bestSleep.score)) : null,
        daysWithRecordsLabel: loading
            ? "…"
            : hasError
                ? "—"
                : `${daysWithRecords} / ${periodDaysCount}`,
    };
}

function computeAverageRpe(sessions: readonly WorkoutSession[]): number | null {
    const values = sessions
        .map((session) => session.effortRpe)
        .filter(isFiniteNumber);

    if (values.length === 0) return null;

    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.round(average * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function computeReadiness(sleepScore: number | null, dayRpe: number | null): number | null {
    if (!isFiniteNumber(sleepScore)) return null;

    let readiness = sleepScore;

    if (isFiniteNumber(dayRpe)) {
        readiness += dayRpe >= 6 ? -(dayRpe - 5) * 6 : (5 - dayRpe) * 2;
    }

    return Math.round(clamp(readiness, 0, 100));
}

function computeStagePercent(stageMinutes: number | null, totalMinutes: number | null): number | null {
    if (!isFiniteNumber(stageMinutes) || !isFiniteNumber(totalMinutes) || totalMinutes <= 0) {
        return null;
    }

    return Math.round((stageMinutes / totalMinutes) * 100);
}

export function buildSleepDayRows(days: readonly CalendarDayFull[]): SleepDayRow[] {
    return days.flatMap((day) => {
        const sleep = day.sleep ?? null;
        const summary = day.sleepSummary ?? null;
        if (!sleep && !summary) return [];

        const totalMinutes = sleep?.timeAsleepMinutes ?? summary?.timeAsleepMinutes ?? null;
        const timeInBedMinutes = sleep?.timeInBedMinutes ?? summary?.timeInBedMinutes ?? null;
        const score = sleep?.score ?? summary?.score ?? null;
        const remMinutes = sleep?.remMinutes ?? summary?.remMinutes ?? null;
        const deepMinutes = sleep?.deepMinutes ?? summary?.deepMinutes ?? null;
        const coreMinutes = sleep?.coreMinutes ?? summary?.coreMinutes ?? null;
        const awakeMinutes = sleep?.awakeMinutes ?? summary?.awakeMinutes ?? null;

        const sessions = Array.isArray(day.training?.sessions) ? day.training.sessions : [];
        const dayRpe = day.trainingSummary?.dayEffortRpe
            ?? day.training?.dayEffortRpe
            ?? computeAverageRpe(sessions);

        return [{
            date: day.date ?? "—",
            totalMinutes,
            score,
            efficiencyPct: calcSleepEfficiencyPct(totalMinutes, timeInBedMinutes),
            readiness: computeReadiness(score, dayRpe),
            remPct: computeStagePercent(remMinutes, totalMinutes),
            deepPct: computeStagePercent(deepMinutes, totalMinutes),
            coreMinutes,
            awakeMinutes,
            source: sleep?.source ?? null,
            sourceDevice: sleep?.sourceDevice ?? null,
        }];
    });
}

function toFiniteNumber(value: NumberOrDash): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

type ComparisonFormat = "integer" | "decimal" | "duration" | "sleepMinutes";
type ChangeFormat = "absolute" | "percent" | "minutes";

type ComparisonMetricInput = {
    key: string;
    label: string;
    current: NumberOrDash;
    comparison: NumberOrDash;
    format: ComparisonFormat;
    changeFormat: ChangeFormat;
};

function formatComparisonMinutes(value: number): string {
    const rounded = Math.round(value);
    const hours = Math.floor(rounded / 60);
    const minutes = Math.abs(rounded % 60);

    return hours > 0 ? `${hours}h ${minutes}m` : `${rounded} min`;
}

function formatComparisonValue(value: NumberOrDash, formatType: ComparisonFormat): string {
    const numeric = toFiniteNumber(value);
    if (numeric === null) return "—";

    if (formatType === "duration" || formatType === "sleepMinutes") {
        return formatComparisonMinutes(numeric);
    }

    if (formatType === "decimal") {
        return Number(numeric.toFixed(2)).toString();
    }

    return Math.round(numeric).toString();
}

function formatSigned(value: number, maximumDecimals = 0): string {
    const rounded = Number(value.toFixed(maximumDecimals));
    if (rounded > 0) return `+${rounded}`;
    return rounded.toString();
}

function formatChange(metric: ComparisonMetricInput): string {
    const current = toFiniteNumber(metric.current);
    const comparison = toFiniteNumber(metric.comparison);
    if (current === null || comparison === null) return "—";

    const difference = current - comparison;

    if (metric.changeFormat === "minutes") {
        const rounded = Math.round(difference);
        if (rounded === 0) return "0 min";
        return `${rounded > 0 ? "+" : ""}${rounded} min`;
    }

    if (metric.changeFormat === "percent") {
        const absolute = formatSigned(difference, metric.format === "decimal" ? 2 : 0);
        if (comparison === 0) return absolute;

        const percentage = (difference / Math.abs(comparison)) * 100;
        return `${absolute} (${formatSigned(percentage, 1)}%)`;
    }

    return formatSigned(difference, metric.format === "decimal" ? 2 : 0);
}

function materializeComparisonMetric(
    input: ComparisonMetricInput,
    currentLabel: string,
    comparisonLabel: string,
): ComparisonMetric {
    return {
        key: input.key,
        label: input.label,
        current: input.current,
        comparison: input.comparison,
        currentLabel: `${currentLabel}: ${formatComparisonValue(input.current, input.format)}`,
        comparisonLabel: `${comparisonLabel}: ${formatComparisonValue(input.comparison, input.format)}`,
        change: formatChange(input),
    };
}

export function buildMonthComparisonGroups(args: {
    currentLabel: string;
    comparisonLabel: string;
    currentKpis: WeekKpis;
    comparisonKpis: WeekKpis;
    currentDays: readonly CalendarDayFull[];
    comparisonDays: readonly CalendarDayFull[];
}): MonthComparisonGroups {
    const {
        currentLabel,
        comparisonLabel,
        currentKpis,
        comparisonKpis,
        currentDays,
        comparisonDays,
    } = args;

    const trainingInputs: ComparisonMetricInput[] = [
        {
            key: "trainingDays",
            label: "Días entrenados",
            current: countTrainingDays(currentDays),
            comparison: countTrainingDays(comparisonDays),
            format: "integer",
            changeFormat: "percent",
        },
        {
            key: "sessions",
            label: "Sesiones",
            current: currentKpis.sessionsCount,
            comparison: comparisonKpis.sessionsCount,
            format: "integer",
            changeFormat: "percent",
        },
        {
            key: "duration",
            label: "Duración",
            current: currentKpis.durationMinutes,
            comparison: comparisonKpis.durationMinutes,
            format: "duration",
            changeFormat: "percent",
        },
        {
            key: "activeKcal",
            label: "Kcal activas",
            current: currentKpis.activeKcal,
            comparison: comparisonKpis.activeKcal,
            format: "integer",
            changeFormat: "percent",
        },
        {
            key: "media",
            label: "Media",
            current: currentKpis.mediaCount,
            comparison: comparisonKpis.mediaCount,
            format: "integer",
            changeFormat: "percent",
        },
    ];

    const sleepInputs: ComparisonMetricInput[] = [
        {
            key: "sleepDays",
            label: "Días con sueño",
            current: currentKpis.sleepDays,
            comparison: comparisonKpis.sleepDays,
            format: "integer",
            changeFormat: "absolute",
        },
        {
            key: "sleepAverage",
            label: "Sueño promedio",
            current: currentKpis.sleepAvgTotal,
            comparison: comparisonKpis.sleepAvgTotal,
            format: "sleepMinutes",
            changeFormat: "minutes",
        },
        {
            key: "sleepScore",
            label: "Sleep Score",
            current: currentKpis.sleepAvgScore,
            comparison: comparisonKpis.sleepAvgScore,
            format: "decimal",
            changeFormat: "absolute",
        },
        {
            key: "remAverage",
            label: "REM promedio",
            current: currentKpis.sleepAvgRem,
            comparison: comparisonKpis.sleepAvgRem,
            format: "sleepMinutes",
            changeFormat: "minutes",
        },
        {
            key: "deepAverage",
            label: "Deep promedio",
            current: currentKpis.sleepAvgDeep,
            comparison: comparisonKpis.sleepAvgDeep,
            format: "sleepMinutes",
            changeFormat: "minutes",
        },
    ];

    return {
        training: trainingInputs.map((input) => materializeComparisonMetric(
            input,
            currentLabel,
            comparisonLabel,
        )),
        sleep: sleepInputs.map((input) => materializeComparisonMetric(
            input,
            currentLabel,
            comparisonLabel,
        )),
    };
}

export function sessionTypeKey(row: WeekBySessionTypeRow, index: number): string {
    return `${row.sessionType}-${index}`;
}
