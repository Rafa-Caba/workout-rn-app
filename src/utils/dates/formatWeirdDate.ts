// src/utils/dates/formatWeirdDate.ts

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function pad2(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
}

function clampInt(n: number, min: number, max: number): number {
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
}

/**
 * Converts strings like:
 *  - "2/27/2026, 5:02:35 PM"
 *  - "2/27/2026, 50:02:35 pm" (invalid hour -> fixed)
 * into:
 *  - "Feb, 27, 26 5:02 PM"
 */
export function formatWeirdUsDateTime(input: string): string {
    const raw = String(input ?? "").trim();
    if (!raw) return "—";

    // Expect: M/D/YYYY, H:MM(:SS)? AM/PM
    const m = raw.match(
        /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*,\s*(\d{1,2})\s*:\s*(\d{2})(?:\s*:\s*(\d{2}))?\s*(am|pm)\s*$/i
    );
    if (!m) return raw;

    const month = clampInt(Number(m[1]), 1, 12);
    const day = clampInt(Number(m[2]), 1, 31);
    const yearFull = clampInt(Number(m[3]), 0, 9999);

    let hh = Number(m[4]);
    const mm = clampInt(Number(m[5]), 0, 59);
    // seconds unused for output but parsed to validate
    const ss = m[6] != null ? clampInt(Number(m[6]), 0, 59) : 0;

    const ampm = String(m[7]).toLowerCase() as "am" | "pm";

    // Fix weird hours like "50:02:35 pm"
    if (!Number.isFinite(hh)) hh = 0;
    if (hh > 23) hh = hh % 24;
    hh = clampInt(hh, 0, 23);

    // Convert to 12h for display
    const isPm = ampm === "pm";
    let displayHour = hh % 12;
    if (displayHour === 0) displayHour = 12;

    // Normalize AM/PM based on original suffix (don’t infer from hh)
    const displayAmPm = isPm ? "PM" : "AM";

    const monLabel = MONTHS[month - 1];
    const yy = pad2(yearFull % 100);

    return `${monLabel}, ${pad2(day)}, ${yy} ${displayHour}:${pad2(mm)} ${displayAmPm}`;
}