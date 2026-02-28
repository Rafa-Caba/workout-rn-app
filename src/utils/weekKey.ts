import { addWeeks, endOfISOWeek, getISOWeek, getISOWeekYear, startOfISOWeek } from "date-fns";

/**
 * Backend contract uses week keys like: YYYY-W##
 * Example: 2026-W05
 */
export function toWeekKey(date: Date): string {
    const year = getISOWeekYear(date);
    const week = getISOWeek(date);
    const padded = String(week).padStart(2, "0");
    return `${year}-W${padded}`;
}

export function normalizeWeekKey(value: string): string {
    const m = /^(\d{4})-W(\d{2})$/.exec(value);
    if (!m) return value;
    const year = m[1];
    const week = m[2];
    return `${year}-W${week}`;
}

/**
 * Converts weekKey (YYYY-W##) to the start date (Monday) of that ISO week.
 *
 * IMPORTANT:
 * This function must always return a Date to keep callers simple and avoid null
 * checks throughout the UI. If the weekKey is invalid, we fallback to the start
 * of the current ISO week.
 *
 * Algorithm:
 * - ISO week 1 is the week containing Jan 4.
 * - Find Monday of ISO week 1, then add (week-1) weeks.
 */
export function weekKeyToStartDate(weekKey: string): Date {
    const fallback = startOfISOWeek(new Date());

    const m = /^(\d{4})-W(\d{2})$/.exec(weekKey);
    if (!m) return fallback;

    const year = Number(m[1]);
    const week = Number(m[2]);

    if (!Number.isFinite(year) || !Number.isFinite(week) || week < 1 || week > 53) {
        return fallback;
    }

    const jan4 = new Date(year, 0, 4);
    const week1Start = startOfISOWeek(jan4);
    return addWeeks(week1Start, week - 1);
}

/**
 * Returns the end date (Sunday) of the ISO week for the given key.
 * Always returns a Date; falls back to the end of the current ISO week when invalid.
 */
export function weekKeyToEndDate(weekKey: string): Date {
    const start = weekKeyToStartDate(weekKey);
    return endOfISOWeek(start);
}