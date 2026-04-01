// /src/features/sleep/components/sleepDraft.ts

import type { SleepBlock, WorkoutDataSource } from "@/src/types/workoutDay.types";

export type SleepDraft = {
    timeAsleepMinutes: string;
    timeInBedMinutes: string;
    score: string;

    awakeMinutes: string;
    remMinutes: string;
    coreMinutes: string;
    deepMinutes: string;

    source: WorkoutDataSource | null;
    sourceDevice: string;
};

function toStr(n: number | null | undefined): string {
    return typeof n === "number" && Number.isFinite(n) ? String(n) : "";
}

function toNullableString(value: string | null | undefined): string {
    return typeof value === "string" ? value : "";
}

function coerceNullableInt(v: string): number | null {
    const s = String(v ?? "").trim();
    if (!s) return null;

    const n = Number(s);
    if (!Number.isFinite(n)) return null;

    return Math.max(0, Math.trunc(n));
}

function coerceNullableScore(v: string): number | null {
    const n = coerceNullableInt(v);
    if (n === null) return null;

    return Math.max(0, Math.min(100, n));
}

function coerceNullableString(v: string): string | null {
    const s = String(v ?? "").trim();
    return s.length ? s : null;
}

function coerceNullableSource(value: unknown): WorkoutDataSource | null {
    return value === "manual" || value === "healthkit" || value === "health-connect"
        ? value
        : null;
}

export function toSleepDraft(sleep: SleepBlock | null): SleepDraft {
    return {
        timeAsleepMinutes: toStr(sleep?.timeAsleepMinutes),
        timeInBedMinutes: toStr(sleep?.timeInBedMinutes),
        score: toStr(sleep?.score),

        awakeMinutes: toStr(sleep?.awakeMinutes),
        remMinutes: toStr(sleep?.remMinutes),
        coreMinutes: toStr(sleep?.coreMinutes),
        deepMinutes: toStr(sleep?.deepMinutes),

        source: coerceNullableSource(sleep?.source),
        sourceDevice: toNullableString(sleep?.sourceDevice),
    };
}

export function normalizeSleepDraft(d: SleepDraft): SleepBlock {
    return {
        timeAsleepMinutes: coerceNullableInt(d.timeAsleepMinutes),
        timeInBedMinutes: coerceNullableInt(d.timeInBedMinutes),
        score: coerceNullableScore(d.score),

        awakeMinutes: coerceNullableInt(d.awakeMinutes),
        remMinutes: coerceNullableInt(d.remMinutes),
        coreMinutes: coerceNullableInt(d.coreMinutes),
        deepMinutes: coerceNullableInt(d.deepMinutes),

        source: coerceNullableSource(d.source),
        sourceDevice: coerceNullableString(d.sourceDevice),
        importedAt: null,
        lastSyncedAt: null,
        raw: null,
    };
}