// /src/utils/dates/formatWeirdDate.ts

import type { ISODate } from "@/src/types/workoutDay.types";

const MONTHS_EN = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
] as const;

const MONTHS_ES = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
] as const;

/**
 * Pads single-digit numbers to 2 digits.
 */
function pad2(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
}

/**
 * Clamps a number between a min and max range.
 */
function clampInt(n: number, min: number, max: number): number {
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
}

/**
 * Returns today's date using LOCAL timezone,
 * avoiding UTC shifts caused by toISOString().
 */
export function getLocalTodayIsoDate(): ISODate {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = pad2(now.getMonth() + 1);
    const dd = pad2(now.getDate());

    return `${yyyy}-${mm}-${dd}` as ISODate;
}

/**
 * Validates and parses yyyy-MM-dd safely.
 */
function parseIsoDateParts(input: string): { year: number; month: number; day: number } | null {
    const raw = String(input ?? "").trim();
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
        return null;
    }

    if (month < 1 || month > 12) {
        return null;
    }

    if (day < 1 || day > 31) {
        return null;
    }

    return { year, month, day };
}

/**
 * Formats yyyy-MM-dd into a readable label.
 *
 * Examples:
 * - 2026-04-01 -> "Abr 01, 2026" (es)
 * - 2026-04-01 -> "Apr 01, 2026" (en)
 */
export function formatIsoDateLabel(
    input: string,
    locale: "es" | "en" = "es"
): string {
    const parsed = parseIsoDateParts(input);

    if (!parsed) {
        return String(input ?? "").trim() || "—";
    }

    const months = locale === "es" ? MONTHS_ES : MONTHS_EN;
    const monthLabel = months[parsed.month - 1];

    return `${monthLabel} ${pad2(parsed.day)}, ${parsed.year}`;
}

/**
 * Converts strings like:
 *  - "2/27/2026, 5:02:35 PM"
 *  - "2/27/2026, 50:02:35 pm"
 * into:
 *  - "Feb, 27, 26 - 5:02 PM"
 */
export function formatWeirdUsDateTime(input: string): string {
    const raw = String(input ?? "").trim();
    if (!raw) return "—";

    const match = raw.match(
        /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*,\s*(\d{1,2})\s*:\s*(\d{2})(?:\s*:\s*(\d{2}))?\s*(am|pm)\s*$/i
    );

    if (!match) return raw;

    const month = clampInt(Number(match[1]), 1, 12);
    const day = clampInt(Number(match[2]), 1, 31);
    const yearFull = clampInt(Number(match[3]), 0, 9999);

    let hh = Number(match[4]);
    const mm = clampInt(Number(match[5]), 0, 59);

    const ampm = String(match[7]).toLowerCase() as "am" | "pm";

    if (!Number.isFinite(hh)) hh = 0;
    if (hh > 23) hh = hh % 24;
    hh = clampInt(hh, 0, 23);

    let displayHour = hh % 12;
    if (displayHour === 0) displayHour = 12;

    const displayAmPm = ampm === "pm" ? "PM" : "AM";
    const monLabel = MONTHS_EN[month - 1];
    const yy = pad2(yearFull % 100);

    return `${monLabel}, ${pad2(day)}, ${yy} - ${displayHour}:${pad2(mm)} ${displayAmPm}`;
}

/**
 * Flexible formatter for UI labels.
 *
 * Supports:
 * - yyyy-MM-dd
 * - M/D/YYYY, h:mm(:ss) AM/PM
 * - fallback: raw string
 */
export function formatFlexibleDateLabel(
    input: string,
    locale: "es" | "en" = "es"
): string {
    const raw = String(input ?? "").trim();

    if (!raw) return "—";

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return formatIsoDateLabel(raw, locale);
    }

    if (/^\d{1,2}\/\d{1,2}\/\d{4}\s*,/i.test(raw)) {
        return formatWeirdUsDateTime(raw);
    }

    return raw;
}