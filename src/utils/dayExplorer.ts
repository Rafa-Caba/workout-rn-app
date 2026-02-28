type AnyRecord = Record<string, unknown>;

export function isRecord(v: unknown): v is AnyRecord {
    return typeof v === "object" && v !== null;
}

export function pickNumber(obj: AnyRecord, keys: string[]): number | null {
    for (const k of keys) {
        const v = obj[k];
        if (typeof v === "number") return v;
    }
    return null;
}

export type DayExplorerKpis = {
    trainingSeconds: number | null;
    activeKcal: number | null;
    sleepMinutes: number | null;
};

export function buildDayExplorerKpis(summary: unknown): DayExplorerKpis | null {
    if (!summary || typeof summary !== "object") return null;

    const s = summary as AnyRecord;
    const training = isRecord(s.training) ? s.training : null;

    const trainingSeconds = training && typeof training.durationSeconds === "number" ? training.durationSeconds : null;
    const activeKcal = training && typeof training.activeKcal === "number" ? training.activeKcal : null;

    let sleepMinutes: number | null = null;
    const sleep = "sleep" in s ? (s as AnyRecord).sleep : null;

    if (isRecord(sleep)) {
        sleepMinutes =
            pickNumber(sleep, ["timeAsleepMinutes", "totalMinutes", "totalSleepMinutes", "avgTotalMinutes", "sleepMinutes"]) ??
            null;
    }

    return { trainingSeconds, activeKcal, sleepMinutes };
}

export function calcSleepEfficiencyPct(
    timeAsleepMinutes: number | null | undefined,
    timeInBedMinutes: number | null | undefined
): number | null {
    if (!timeAsleepMinutes || !timeInBedMinutes || timeInBedMinutes <= 0) return null;
    return Math.round((timeAsleepMinutes / timeInBedMinutes) * 100);
}