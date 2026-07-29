// /src/utils/dates/localDateTime.ts
// Local-calendar date helpers shared by HealthKit, Health Connect, Cardio,
// calendar screens, and QA tests. Date-only values are interpreted in the
// device timezone instead of UTC so a local day never shifts unexpectedly.

import type { ISODate, ISODateTime } from "@/src/types/workoutDay.types";

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export type LocalDayRange = {
    startAt: ISODateTime;
    endAtExclusive: ISODateTime;
};

type ISODateParts = {
    year: number;
    monthIndex: number;
    day: number;
};

function pad2(value: number): string {
    return String(value).padStart(2, "0");
}

function parseISODateParts(value: string): ISODateParts | null {
    const match = ISO_DATE_PATTERN.exec(value.trim());
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
        return null;
    }

    const candidate = new Date(year, month - 1, day, 0, 0, 0, 0);

    if (
        candidate.getFullYear() !== year ||
        candidate.getMonth() !== month - 1 ||
        candidate.getDate() !== day
    ) {
        return null;
    }

    return {
        year,
        monthIndex: month - 1,
        day,
    };
}

export function isISODate(value: string): value is ISODate {
    return parseISODateParts(value) !== null;
}

export function parseISODateLocal(value: string): Date | null {
    const parts = parseISODateParts(value);
    if (!parts) return null;

    return new Date(parts.year, parts.monthIndex, parts.day, 0, 0, 0, 0);
}

export function formatLocalISODate(date: Date): ISODate {
    const year = date.getFullYear();
    const month = pad2(date.getMonth() + 1);
    const day = pad2(date.getDate());

    return `${year}-${month}-${day}`;
}

export function addLocalDaysISO(date: ISODate, amount: number): ISODate {
    const parsed = parseISODateLocal(date);
    if (!parsed) return date;

    parsed.setDate(parsed.getDate() + amount);
    return formatLocalISODate(parsed);
}

/**
 * Returns a half-open local-day range: [local midnight, next local midnight).
 * Using the next local midnight keeps DST transitions correct even when a day
 * contains 23 or 25 hours.
 */
export function buildLocalDayRangeISO(date: ISODate): LocalDayRange {
    const start = parseISODateLocal(date);

    if (!start) {
        throw new Error(`Fecha local inválida: ${date}`);
    }

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return {
        startAt: start.toISOString(),
        endAtExclusive: end.toISOString(),
    };
}

export function resolveLocalISODateFromDateTime(
    value: ISODateTime | string | null | undefined,
): ISODate | null {
    if (!value) return null;

    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) return null;

    return formatLocalISODate(parsed);
}

/**
 * Enumerates local calendar dates touched by a half-open datetime range.
 * An end value exactly at midnight does not incorrectly add the following day.
 */
export function enumerateLocalDatesInDateTimeRange(
    from: ISODateTime,
    to: ISODateTime,
): ISODate[] {
    const start = new Date(from);
    const end = new Date(to);

    if (
        !Number.isFinite(start.getTime()) ||
        !Number.isFinite(end.getTime()) ||
        start.getTime() >= end.getTime()
    ) {
        return [];
    }

    const finalCoveredInstant = new Date(end.getTime() - 1);
    const firstDate = formatLocalISODate(start);
    const lastDate = formatLocalISODate(finalCoveredInstant);

    const dates: ISODate[] = [];
    let current = firstDate;

    while (current <= lastDate) {
        dates.push(current);
        const next = addLocalDaysISO(current, 1);
        if (next === current) break;
        current = next;
    }

    return dates;
}

/**
 * Checks whether a session interval overlaps a local calendar day.
 * Missing or zero-length end values are treated as a one-millisecond event.
 */
export function doesDateTimeRangeOverlapLocalDay(
    startAt: ISODateTime | string | null | undefined,
    endAt: ISODateTime | string | null | undefined,
    date: ISODate,
): boolean {
    if (!startAt) return false;

    const startMs = new Date(startAt).getTime();
    if (!Number.isFinite(startMs)) return false;

    const parsedEndMs = endAt ? new Date(endAt).getTime() : Number.NaN;
    const endMs = Number.isFinite(parsedEndMs) && parsedEndMs > startMs
        ? parsedEndMs
        : startMs + 1;

    const dayRange = buildLocalDayRangeISO(date);
    const dayStartMs = new Date(dayRange.startAt).getTime();
    const dayEndMs = new Date(dayRange.endAtExclusive).getTime();

    return startMs < dayEndMs && endMs > dayStartMs;
}
