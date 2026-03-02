// src/features/sleep/components/sleepDraft.ts
import type { SleepBlock } from "@/src/types/workoutDay.types";

export type SleepDraft = {
    timeAsleepMinutes: string;
    timeInBedMinutes: string;
    score: string;

    awakeMinutes: string;
    remMinutes: string;
    coreMinutes: string;
    deepMinutes: string;

    source: string | null;
};

function toStr(n: number | null | undefined): string {
    return typeof n === "number" && Number.isFinite(n) ? String(n) : "";
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

export function toSleepDraft(sleep: SleepBlock | null): SleepDraft {
    return {
        timeAsleepMinutes: toStr(sleep?.timeAsleepMinutes),
        timeInBedMinutes: toStr(sleep?.timeInBedMinutes),
        score: toStr(sleep?.score),

        awakeMinutes: toStr(sleep?.awakeMinutes),
        remMinutes: toStr(sleep?.remMinutes),
        coreMinutes: toStr(sleep?.coreMinutes),
        deepMinutes: toStr(sleep?.deepMinutes),

        source: sleep?.source ?? null,
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

        source: typeof d.source === "string" ? (d.source.trim() ? d.source.trim() : null) : null,
        raw: null,
    };
}