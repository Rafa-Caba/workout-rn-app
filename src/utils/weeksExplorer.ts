export function numOrDash(v: unknown): number | "—" {
    if (v === null || v === undefined) return "—";
    if (typeof v === "number" && Number.isFinite(v)) return v;
    return "—";
}

export function minutesFromSecondsOrDash(v: unknown): number | "—" {
    if (typeof v !== "number" || !Number.isFinite(v)) return "—";
    return Math.round(v / 60);
}

type AnyRecord = Record<string, unknown>;

function isRecord(v: unknown): v is AnyRecord {
    return typeof v === "object" && v !== null;
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
    mediaCount?: number | "—"; // only if BE returns it later
};

export function extractWeekKpis(weekSummary: unknown): { kpis: WeekKpis; bySessionType: WeekBySessionTypeRow[] } {
    const empty: WeekKpis = {
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

    if (!isRecord(weekSummary)) return { kpis: empty, bySessionType: [] };

    const training = isRecord((weekSummary as any).training) ? (weekSummary as any).training : null;
    const sleep = isRecord((weekSummary as any).sleep) ? (weekSummary as any).sleep : null;

    const daysCount = numOrDash((weekSummary as any).daysCount);
    const mediaCount = numOrDash((weekSummary as any).mediaCount ?? (training as any)?.mediaCount);

    const sessionsCount = numOrDash((training as any)?.sessionsCount);
    const durationMinutes = minutesFromSecondsOrDash((training as any)?.durationSeconds);
    const activeKcal = numOrDash((training as any)?.activeKcal);
    const avgHr = numOrDash((training as any)?.avgHr);
    const maxHr = numOrDash((training as any)?.maxHr);

    const sleepDays = numOrDash((sleep as any)?.daysWithSleep);
    const sleepAvgTotal = numOrDash((sleep as any)?.avgTotalMinutes);
    const sleepAvgScore = numOrDash((sleep as any)?.avgScore);

    const sleepAvgDeep = numOrDash((sleep as any)?.avgDeepMinutes);
    const sleepAvgRem = numOrDash((sleep as any)?.avgRemMinutes);

    const bySessionTypeRaw = Array.isArray((training as any)?.bySessionType) ? ((training as any).bySessionType as any[]) : [];
    const bySessionType: WeekBySessionTypeRow[] = bySessionTypeRaw.map((row) => {
        const maybeMedia = row?.mediaCount;
        const mediaCountPerType = typeof maybeMedia === "number" && Number.isFinite(maybeMedia) ? maybeMedia : undefined;

        return {
            sessionType: typeof row?.sessionType === "string" && row.sessionType.trim() ? row.sessionType : "—",
            sessionsCount: numOrDash(row?.sessionsCount),
            durationMinutes: minutesFromSecondsOrDash(row?.durationSeconds),
            activeKcal: numOrDash(row?.activeKcal),
            ...(mediaCountPerType !== undefined ? { mediaCount: mediaCountPerType } : {}),
        };
    });

    return {
        kpis: {
            daysCount,
            mediaCount,
            sessionsCount,
            durationMinutes,
            activeKcal,
            avgHr,
            maxHr,
            sleepDays,
            sleepAvgTotal,
            sleepAvgScore,
            sleepAvgDeep,
            sleepAvgRem,
        },
        bySessionType,
    };
}