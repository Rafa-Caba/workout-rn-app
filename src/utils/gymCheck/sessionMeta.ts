// /src/utils/gymCheck/sessionMeta.ts
// Preserves imported workout provenance when a Gym Check session is edited.

import type { WorkoutSessionMeta } from "@/src/types/workoutDay.types";

export type GymCheckSessionMetaInput = Record<string, unknown> | null | undefined;

const IMPORT_PROVENANCE_KEYS = [
    "source",
    "sourceDevice",
    "importedAt",
    "lastSyncedAt",
    "externalId",
    "originalType",
    "provider",
    "healthWriteStatus",
    "healthExternalId",
    "healthWrittenAt",
] as const;

type ImportProvenanceKey = (typeof IMPORT_PROVENANCE_KEYS)[number];

function hasPreservableValue(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim().length > 0;
    return true;
}

/**
 * Merges a new Gym Check metadata patch over the existing session metadata.
 *
 * Editable Gym Check fields such as dayEffortRpe may change normally. Import
 * provenance is restored from the current session whenever an update omits it
 * or accidentally sends an empty value, preventing manual edits from erasing
 * HealthKit / Health Connect metadata.
 */
export function mergeGymCheckSessionMeta(
    existingMeta: WorkoutSessionMeta | null | undefined,
    incomingMeta: GymCheckSessionMetaInput
): Record<string, unknown> | null | undefined {
    if (existingMeta === null || existingMeta === undefined) {
        if (incomingMeta === undefined) return undefined;
        if (incomingMeta === null) return null;
        return { ...incomingMeta };
    }

    if (incomingMeta === null || incomingMeta === undefined) {
        return { ...existingMeta };
    }

    const merged: Record<string, unknown> = {
        ...existingMeta,
        ...incomingMeta,
    };

    for (const key of IMPORT_PROVENANCE_KEYS) {
        preserveImportProvenanceValue({
            key,
            existingMeta,
            incomingMeta,
            merged,
        });
    }

    return merged;
}

function preserveImportProvenanceValue(args: {
    key: ImportProvenanceKey;
    existingMeta: WorkoutSessionMeta;
    incomingMeta: Record<string, unknown>;
    merged: Record<string, unknown>;
}): void {
    const incomingValue = args.incomingMeta[args.key];
    const existingValue = args.existingMeta[args.key];

    if (!hasPreservableValue(incomingValue) && hasPreservableValue(existingValue)) {
        args.merged[args.key] = existingValue;
    }
}
