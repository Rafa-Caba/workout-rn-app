import type { WorkoutExerciseSet } from "@/src/types/workoutDay.types";

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function isFiniteNumber(v: unknown): v is number {
    return typeof v === "number" && Number.isFinite(v);
}

/**
 * Returns a normalized default RPE (0..10) or null if invalid.
 * - We allow 0..10 because your schema allows 0..10 (and you may use 0 for "no effort").
 */
export function normalizeDefaultRpe(defaultRpe: unknown): number | null {
    if (!isFiniteNumber(defaultRpe)) return null;
    return clamp(defaultRpe, 0, 10);
}

/**
 * Apply default RPE only when the set's rpe is null/undefined/not a finite number.
 * Intended for "new set" creation, so user can still edit after.
 *
 * Usage:
 *   const patch = applyDefaultRpeToNewSet(defaultRpe)({ ...newSet });
 */
export function applyDefaultRpeToNewSet(defaultRpe: unknown) {
    const normalized = normalizeDefaultRpe(defaultRpe);

    return function <T extends { rpe?: number | null }>(set: T): T {
        // If default is invalid, do nothing.
        if (normalized == null) return set;

        // If set already has a valid RPE, do nothing.
        if (isFiniteNumber(set.rpe)) return set;

        // Apply default.
        return { ...set, rpe: normalized };
    };
}

/**
 * Convenience helper to build a new WorkoutExerciseSet with default RPE applied.
 * Optional, but nice if you construct sets inline.
 */
export function buildNewSetWithDefaultRpe(
    base: Omit<WorkoutExerciseSet, "rpe"> & { rpe?: number | null },
    defaultRpe: unknown
): WorkoutExerciseSet {
    const patch = applyDefaultRpeToNewSet(defaultRpe);
    return patch({ ...base, rpe: base.rpe ?? null }) as WorkoutExerciseSet;
}