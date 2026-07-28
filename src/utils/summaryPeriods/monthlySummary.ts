// src/utils/summaryPeriods/monthlySummary.ts
// Helpers shared with Web for month ranges, comparisons, and ISO-week rollups.

import {
    endOfISOWeek,
    endOfMonth,
    format,
    startOfISOWeek,
    startOfMonth,
} from "date-fns";

import type { CalendarDayFull } from "@/src/types/workoutDay.types";
import { buildTrainingDayRows } from "@/src/utils/summaryPeriods/weeklySummary";

export type MonthRange = {
    from: string;
    to: string;
    daysCount: number;
};

export type MonthWeekRow = {
    key: string;
    label: string;
    sessionsCount: number;
    durationSeconds: number | null;
    activeKcal: number | null;
    avgSleepMinutes: number | null;
};

function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

function parseMonthValue(monthValue: string): Date | null {
    if (!/^\d{4}-\d{2}$/.test(monthValue)) return null;

    const date = new Date(`${monthValue}-01T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
}

function parseIsoDate(dateIso: string | undefined): Date | null {
    if (!dateIso) return null;

    const date = new Date(`${dateIso}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
}

function sumNullable(values: readonly (number | null | undefined)[]): number | null {
    const finiteValues = values.filter(isFiniteNumber);
    return finiteValues.length > 0
        ? finiteValues.reduce((sum, value) => sum + value, 0)
        : null;
}

function averageNullable(values: readonly (number | null | undefined)[]): number | null {
    const finiteValues = values.filter(isFiniteNumber);
    return finiteValues.length > 0
        ? finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length
        : null;
}

function formatWeekRangeLabel(fromIso: string, toIso: string, lang: "es" | "en"): string {
    const fromDate = parseIsoDate(fromIso);
    const toDate = parseIsoDate(toIso);

    if (!fromDate || !toDate) return `${fromIso} → ${toIso}`;

    const locale = lang === "es" ? "es-MX" : "en-US";
    const sameMonth = fromDate.getMonth() === toDate.getMonth();

    if (sameMonth) {
        const month = new Intl.DateTimeFormat(locale, { month: "short" }).format(fromDate);
        return lang === "es"
            ? `${fromDate.getDate()}–${toDate.getDate()} ${month}`
            : `${month} ${fromDate.getDate()}–${toDate.getDate()}`;
    }

    const formatter = new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
    });

    return `${formatter.format(fromDate)} → ${formatter.format(toDate)}`;
}

export function getMonthRange(monthValue: string): MonthRange | null {
    const parsed = parseMonthValue(monthValue);
    if (!parsed) return null;

    const fromDate = startOfMonth(parsed);
    const toDate = endOfMonth(parsed);

    return {
        from: format(fromDate, "yyyy-MM-dd"),
        to: format(toDate, "yyyy-MM-dd"),
        daysCount: toDate.getDate(),
    };
}

export function formatMonthLabel(monthValue: string, lang: "es" | "en" = "es"): string {
    const parsed = parseMonthValue(monthValue);
    if (!parsed) return monthValue;

    const label = new Intl.DateTimeFormat(lang === "es" ? "es-MX" : "en-US", {
        month: "long",
        year: "numeric",
    }).format(parsed);

    return label.charAt(0).toUpperCase() + label.slice(1);
}

export function countTrainingDays(days: readonly CalendarDayFull[]): number {
    return days.filter((day) => {
        const sessionsCount = Array.isArray(day.training?.sessions)
            ? day.training.sessions.length
            : day.trainingSummary?.sessionsCount ?? 0;

        return sessionsCount > 0;
    }).length;
}

export function buildMonthWeekRows(
    days: readonly CalendarDayFull[],
    lang: "es" | "en" = "es",
): MonthWeekRow[] {
    const trainingRowsByDate = new Map(
        buildTrainingDayRows(days).map((row) => [row.date, row] as const),
    );

    const validDays = days
        .flatMap((day) => {
            const date = parseIsoDate(day.date);
            return date ? [{ day, date }] : [];
        })
        .sort((a, b) => a.date.getTime() - b.date.getTime());

    const groups = new Map<string, Array<{ day: CalendarDayFull; date: Date }>>();

    for (const item of validDays) {
        const key = format(startOfISOWeek(item.date), "yyyy-MM-dd");
        const current = groups.get(key) ?? [];
        current.push(item);
        groups.set(key, current);
    }

    return Array.from(groups.entries()).map(([key, items]) => {
        const sortedItems = [...items].sort((a, b) => a.date.getTime() - b.date.getTime());
        const first = sortedItems[0];
        const last = sortedItems[sortedItems.length - 1];

        const trainingRows = sortedItems.flatMap(({ day }) => {
            const dateIso = day.date ?? "";
            const row = trainingRowsByDate.get(dateIso);
            return row ? [row] : [];
        });

        const sleepMinutes = sortedItems.map(({ day }) => (
            day.sleep?.timeAsleepMinutes
            ?? day.sleepSummary?.timeAsleepMinutes
            ?? null
        ));

        const weekStart = startOfISOWeek(first.date);
        const weekEnd = endOfISOWeek(last.date);
        const visibleFrom = first.date.getTime() > weekStart.getTime() ? first.date : weekStart;
        const visibleTo = last.date.getTime() < weekEnd.getTime() ? last.date : weekEnd;

        return {
            key,
            label: formatWeekRangeLabel(
                format(visibleFrom, "yyyy-MM-dd"),
                format(visibleTo, "yyyy-MM-dd"),
                lang,
            ),
            sessionsCount: trainingRows.reduce((total, row) => total + row.sessionsCount, 0),
            durationSeconds: sumNullable(trainingRows.map((row) => row.durationSeconds)),
            activeKcal: sumNullable(trainingRows.map((row) => row.activeKcal)),
            avgSleepMinutes: averageNullable(sleepMinutes),
        };
    });
}
