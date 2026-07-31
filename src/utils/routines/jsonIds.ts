// /src/utils/routines/jsonIds.ts
// Normalizes routine JSON payloads before saving from the RN JSON editor.
// Every exercise receives a stable id and a typed attachmentPublicIds array.

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createExerciseId(): string {
    const cryptoValue: unknown = Reflect.get(globalThis, "crypto");

    if (isRecord(cryptoValue)) {
        const randomUUID: unknown = cryptoValue.randomUUID;

        if (typeof randomUUID === "function") {
            const result: unknown = Reflect.apply(randomUUID, cryptoValue, []);

            if (typeof result === "string" && result.trim().length > 0) {
                return result;
            }
        }
    }

    return `ex_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function normalizeAttachmentPublicIds(value: unknown): string[] {
    if (!Array.isArray(value)) return [];

    return value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
}

function normalizeExerciseRecord(value: JsonRecord): JsonRecord {
    const rawId = value.id;
    const id = typeof rawId === "string" && rawId.trim().length > 0
        ? rawId.trim()
        : createExerciseId();

    return {
        ...value,
        id,
        attachmentPublicIds: normalizeAttachmentPublicIds(value.attachmentPublicIds),
    };
}

function normalizeValue(value: unknown, keyHint?: string): unknown {
    if (Array.isArray(value)) {
        if (keyHint === "exercises") {
            return value.map((item) => (
                isRecord(item)
                    ? normalizeExerciseRecord(item)
                    : item
            ));
        }

        return value.map((item) => normalizeValue(item));
    }

    if (!isRecord(value)) return value;

    const normalized: JsonRecord = {};

    for (const [key, child] of Object.entries(value)) {
        normalized[key] = normalizeValue(child, key);
    }

    return normalized;
}

/**
 * Returns a JSON-safe routine payload where every object inside an
 * `exercises` array has a valid id and attachmentPublicIds string array.
 */
export function normalizeRoutineJsonExerciseIds(value: unknown): unknown {
    return normalizeValue(value);
}
