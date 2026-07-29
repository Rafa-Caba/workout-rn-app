// /src/utils/health/healthDate.utils.ts
// Shared date helpers for health sync flows. Date-only values always use the
// device's local calendar so HealthKit and Health Connect agree with the UI.

import type { ISODate, ISODateTime } from "@/src/types/workoutDay.types";
import {
    addLocalDaysISO,
    buildLocalDayRangeISO,
    formatLocalISODate,
    parseISODateLocal,
    resolveLocalISODateFromDateTime,
} from "@/src/utils/dates/localDateTime";

export function isValidDateInput(value: string): boolean {
    if (parseISODateLocal(value)) return true;

    const date = new Date(value);
    return Number.isFinite(date.getTime());
}

export function toIsoNow(): ISODateTime {
    return new Date().toISOString();
}

export function toISODateLocal(date: Date): ISODate {
    return formatLocalISODate(date);
}

export function startOfDayISO(date: ISODate): ISODateTime {
    return buildLocalDayRangeISO(date).startAt;
}

export function endOfDayISO(date: ISODate): ISODateTime {
    const range = buildLocalDayRangeISO(date);
    return new Date(new Date(range.endAtExclusive).getTime() - 1).toISOString();
}

export function buildDayRangeISO(date: ISODate): {
    startAt: ISODateTime;
    endAt: ISODateTime;
} {
    const range = buildLocalDayRangeISO(date);

    return {
        startAt: range.startAt,
        endAt: range.endAtExclusive,
    };
}

export function addDaysISO(date: ISODate, amount: number): ISODate {
    return addLocalDaysISO(date, amount);
}

export function buildDateRangeInclusive(from: ISODate, to: ISODate): ISODate[] {
    const start = parseISODateLocal(from);
    const end = parseISODateLocal(to);

    if (!start || !end || start.getTime() > end.getTime()) {
        return [];
    }

    const dates: ISODate[] = [];
    let current = from;

    while (current <= to) {
        dates.push(current);
        const next = addLocalDaysISO(current, 1);
        if (next === current) break;
        current = next;
    }

    return dates;
}

export function resolveWorkoutDateFromDateTime(value: ISODateTime | null): ISODate | null {
    return resolveLocalISODateFromDateTime(value);
}
