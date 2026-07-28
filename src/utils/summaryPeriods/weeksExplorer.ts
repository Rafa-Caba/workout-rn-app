// src/utils/summaryPeriods/weeksExplorer.ts
// Strongly typed KPI extraction kept aligned with the Web periods implementation.

export function numOrDash(value: unknown): number | "—" {
    if (value === null || value === undefined) return "—";
    if (typeof value === "number" && Number.isFinite(value)) return value;
    return "—";
}

export function minutesFromSecondsOrDash(value: unknown): number | "—" {
    if (typeof value !== "number" || !Number.isFinite(value)) return "—";
    return Math.round(value / 60);
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRecord(value: unknown): UnknownRecord | null {
    return isRecord(value) ? value : null;
}

function getArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
}

function getString(value: unknown, fallback = "—"): string {
    return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

export type WeekKpis = {
    daysCount: number | "—";
    mediaCount: number | "—";
    sessionsCount: number | "—";
    durationMinutes: number | "—";
    activeKcal: number | "—";
    avgHr: number | "—";
    maxHr: number | "—";
    sleepDays: number | "—";
    sleepAvgTotal: number | "—";
    sleepAvgScore: number | "—";
    sleepAvgDeep: number | "—";
    sleepAvgRem: number | "—";
};

export type WeekBySessionTypeRow = {
    sessionType: string;
    sessionsCount: number | "—";
    durationMinutes: number | "—";
    activeKcal: number | "—";
    mediaCount?: number | "—";
};

function emptyKpis(): WeekKpis {
    return {
        daysCount: "—",
        mediaCount: "—",
        sessionsCount: "—",
        durationMinutes: "—",
        activeKcal: "—",
        avgHr: "—",
        maxHr: "—",
        sleepDays: "—",
        sleepAvgTotal: "—",
        sleepAvgScore: "—",
        sleepAvgDeep: "—",
        sleepAvgRem: "—",
    };
}

export function extractWeekKpis(
    summary: unknown,
): { kpis: WeekKpis; bySessionType: WeekBySessionTypeRow[] } {
    const root = getRecord(summary);
    if (!root) return { kpis: emptyKpis(), bySessionType: [] };

    const training = getRecord(root.training);
    const sleep = getRecord(root.sleep);

    const mediaCountSource = root.mediaCount ?? training?.mediaCount;
    const bySessionType = getArray(training?.bySessionType).map((row): WeekBySessionTypeRow => {
        const item = getRecord(row);
        const mediaCount = numOrDash(item?.mediaCount);

        return {
            sessionType: getString(item?.sessionType),
            sessionsCount: numOrDash(item?.sessionsCount),
            durationMinutes: minutesFromSecondsOrDash(item?.durationSeconds),
            activeKcal: numOrDash(item?.activeKcal),
            ...(mediaCount !== "—" ? { mediaCount } : {}),
        };
    });

    return {
        kpis: {
            daysCount: numOrDash(root.daysCount),
            mediaCount: numOrDash(mediaCountSource),
            sessionsCount: numOrDash(training?.sessionsCount),
            durationMinutes: minutesFromSecondsOrDash(training?.durationSeconds),
            activeKcal: numOrDash(training?.activeKcal),
            avgHr: numOrDash(training?.avgHr),
            maxHr: numOrDash(training?.maxHr),
            sleepDays: numOrDash(sleep?.daysWithSleep),
            sleepAvgTotal: numOrDash(sleep?.avgTotalMinutes),
            sleepAvgScore: numOrDash(sleep?.avgScore),
            sleepAvgDeep: numOrDash(sleep?.avgDeepMinutes),
            sleepAvgRem: numOrDash(sleep?.avgRemMinutes),
        },
        bySessionType,
    };
}
