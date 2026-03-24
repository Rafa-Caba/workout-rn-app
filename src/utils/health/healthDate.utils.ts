// /src/utils/health/healthDate.utils.ts

import type { ISODate, ISODateTime } from "@/src/types/workoutDay.types";

/**
 * Small date helpers for health sync flows.
 * We keep them isolated so iOS/Android bridges, mappers and hooks use
 * the same date boundaries and canonical formats.
 */

function pad2(value: number): string {
    return String(value).padStart(2, "0");
}

export function isValidDateInput(value: string): boolean {
    const date = new Date(value);
    return Number.isFinite(date.getTime());
}

export function toIsoNow(): ISODateTime {
    return new Date().toISOString();
}

export function toISODateLocal(date: Date): ISODate {
    const year = date.getFullYear();
    const month = pad2(date.getMonth() + 1);
    const day = pad2(date.getDate());

    return `${year}-${month}-${day}`;
}

export function startOfDayISO(date: ISODate): ISODateTime {
    return new Date(`${date}T00:00:00.000`).toISOString();
}

export function endOfDayISO(date: ISODate): ISODateTime {
    return new Date(`${date}T23:59:59.999`).toISOString();
}

export function buildDayRangeISO(date: ISODate): {
    startAt: ISODateTime;
    endAt: ISODateTime;
} {
    return {
        startAt: startOfDayISO(date),
        endAt: endOfDayISO(date),
    };
}

export function addDaysISO(date: ISODate, amount: number): ISODate {
    const base = new Date(`${date}T00:00:00.000`);
    base.setDate(base.getDate() + amount);
    return toISODateLocal(base);
}

export function buildDateRangeInclusive(from: ISODate, to: ISODate): ISODate[] {
    const start = new Date(`${from}T00:00:00.000`);
    const end = new Date(`${to}T00:00:00.000`);

    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
        return [];
    }

    if (start.getTime() > end.getTime()) {
        return [];
    }

    const dates: ISODate[] = [];
    const current = new Date(start);

    while (current.getTime() <= end.getTime()) {
        dates.push(toISODateLocal(current));
        current.setDate(current.getDate() + 1);
    }

    return dates;
}

export function resolveWorkoutDateFromDateTime(value: ISODateTime | null): ISODate | null {
    if (!value) return null;

    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return null;

    return toISODateLocal(date);
}