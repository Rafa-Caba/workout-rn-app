// /src/features/sleep/components/sleepDraft.ts
// Converts persisted sleep data into editable form state while preserving
// immutable HealthKit / Health Connect provenance metadata across manual edits.

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

    /**
     * Import metadata is not edited by the form, but it must remain in the
     * draft so a manual score or stage correction does not erase provenance.
     */
    importedAt: string | null;
    lastSyncedAt: string | null;
    raw: unknown | null;
};

function toStr(n: number | null | undefined): string {
    return typeof n === "number" && Number.isFinite(n) ? String(n) : "";
}

function toNullableString(value: string | null | undefined): string {
    return typeof value === "string" ? value : "";
}

function preserveNullableString(value: string | null | undefined): string | null {
    if (typeof value !== "string") return null;

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
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

/**
 * Builds editable form state without dropping metadata that is not rendered as
 * an input. This is what keeps Imported At / Last Synced At after editing score.
 */
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
        importedAt: preserveNullableString(sleep?.importedAt),
        lastSyncedAt: preserveNullableString(sleep?.lastSyncedAt),
        raw: sleep?.raw ?? null,
    };
}

/**
 * Converts form state back to the canonical SleepBlock while carrying forward
 * import provenance. Only editable metric fields are normalized.
 */
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
        importedAt: preserveNullableString(d.importedAt),
        lastSyncedAt: preserveNullableString(d.lastSyncedAt),
        raw: d.raw ?? null,
    };
}
