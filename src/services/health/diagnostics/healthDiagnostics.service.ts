// /src/services/health/diagnostics/healthDiagnostics.service.ts

import AsyncStorage from "@react-native-async-storage/async-storage";

import type {
    HealthDiagnosticEvent,
    HealthDiagnosticJsonValue,
} from "@/src/types/health/healthDiagnostics.types";

const STORAGE_KEY = "workout.health.diagnostics.v2";
export const HEALTH_DIAGNOSTIC_MAX_EVENTS = 100;
const MAX_STORAGE_CHARACTERS = 1_500_000;
const MAX_JSON_DEPTH = 5;
const MAX_ARRAY_ITEMS = 60;
const MAX_OBJECT_KEYS = 80;

type HealthDiagnosticListener = (events: HealthDiagnosticEvent[]) => void;

let memoryEvents: HealthDiagnosticEvent[] | null = null;
let writeQueue: Promise<void> = Promise.resolve();
const listeners = new Set<HealthDiagnosticListener>();

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

function isSleepQueryRange(value: unknown): boolean {
    return (
        isRecord(value) &&
        typeof value.targetDate === "string" &&
        typeof value.startDate === "string" &&
        typeof value.endDate === "string" &&
        (value.strategy === "previous-noon-to-target-evening" ||
            value.strategy === "previous-evening-to-target-evening")
    );
}

function isWorkoutQueryRange(value: unknown): boolean {
    return (
        isRecord(value) &&
        typeof value.targetDate === "string" &&
        typeof value.startDate === "string" &&
        typeof value.endDate === "string" &&
        value.strategy === "local-calendar-day"
    );
}

function hasValidCommonEventFields(value: Record<string, unknown>): boolean {
    const validLevel =
        value.level === "info" || value.level === "warning" || value.level === "error";

    return (
        typeof value.id === "string" &&
        typeof value.createdAt === "string" &&
        (value.provider === "healthkit" || value.provider === "health-connect") &&
        validLevel
    );
}

function isHealthDiagnosticEvent(value: unknown): value is HealthDiagnosticEvent {
    if (!isRecord(value) || !hasValidCommonEventFields(value)) return false;

    if (value.kind === "availability") {
        return (
            typeof value.available === "boolean" &&
            typeof value.nativeFunctionAvailable === "boolean" &&
            (typeof value.errorMessage === "string" || value.errorMessage === null)
        );
    }

    if (value.kind === "permissions") {
        return (
            isStringArray(value.requestedPermissions) &&
            typeof value.nativeRequestCompleted === "boolean" &&
            (value.readAccessVerification === "confirmed" ||
                value.readAccessVerification === "requested-only" ||
                value.readAccessVerification === "unknown") &&
            (typeof value.errorMessage === "string" || value.errorMessage === null)
        );
    }

    if (value.kind === "sleep-query-started") {
        return isSleepQueryRange(value.range);
    }

    if (value.kind === "sleep-query-result") {
        return (
            isSleepQueryRange(value.range) &&
            isFiniteNumber(value.receivedSampleCount) &&
            isFiniteNumber(value.storedSampleCount) &&
            typeof value.samplesTruncated === "boolean" &&
            Array.isArray(value.samples)
        );
    }

    if (value.kind === "sleep-normalization") {
        const validOutcome =
            value.outcome === "normalized" ||
            value.outcome === "no-samples" ||
            value.outcome === "no-target-night" ||
            value.outcome === "no-meaningful-sleep";

        return (
            typeof value.targetDate === "string" &&
            isFiniteNumber(value.receivedSampleCount) &&
            isFiniteNumber(value.validSampleCount) &&
            isFiniteNumber(value.rejectedSampleCount) &&
            isFiniteNumber(value.duplicateSampleCount) &&
            isFiniteNumber(value.targetDateSampleCount) &&
            isFiniteNumber(value.targetNightSampleCount) &&
            isFiniteNumber(value.discardedTargetDateSampleCount) &&
            isStringArray(value.availableNightKeys) &&
            Array.isArray(value.nightSummaries) &&
            isStringArray(value.unknownValues) &&
            (typeof value.selectedSourceKey === "string" || value.selectedSourceKey === null) &&
            Array.isArray(value.sourceSummaries) &&
            isRecord(value.totals) &&
            validOutcome
        );
    }

    if (value.kind === "sleep-query-error") {
        return (
            typeof value.targetDate === "string" &&
            (value.range === null || isSleepQueryRange(value.range)) &&
            typeof value.errorMessage === "string" &&
            (typeof value.nativeCode === "string" || value.nativeCode === null)
        );
    }

    if (value.kind === "sleep-persistence") {
        return (
            typeof value.targetDate === "string" &&
            typeof value.saved === "boolean" &&
            value.rawPersisted === false &&
            (typeof value.errorMessage === "string" || value.errorMessage === null)
        );
    }

    if (value.kind === "workout-query-started") {
        return isWorkoutQueryRange(value.range);
    }

    if (value.kind === "workout-query-result") {
        return (
            isWorkoutQueryRange(value.range) &&
            isFiniteNumber(value.receivedSampleCount) &&
            isFiniteNumber(value.mappedSampleCount) &&
            isFiniteNumber(value.rejectedSampleCount) &&
            isFiniteNumber(value.storedSampleCount) &&
            typeof value.samplesTruncated === "boolean" &&
            Array.isArray(value.samples)
        );
    }

    if (value.kind === "workout-selection") {
        const validMatchingCandidateCount =
            value.matchingCandidateCount === undefined ||
            isFiniteNumber(value.matchingCandidateCount);
        const validRequiredProviderWorkoutType =
            value.requiredProviderWorkoutType === undefined ||
            typeof value.requiredProviderWorkoutType === "string";
        const validSelectedSample =
            value.selectedSample === undefined ||
            value.selectedSample === null ||
            isRecord(value.selectedSample);

        return (
            typeof value.targetDate === "string" &&
            isFiniteNumber(value.candidateCount) &&
            validMatchingCandidateCount &&
            isFiniteNumber(value.meaningfulCandidateCount) &&
            validRequiredProviderWorkoutType &&
            (typeof value.selectedExternalId === "string" || value.selectedExternalId === null) &&
            (typeof value.selectedType === "string" || value.selectedType === null) &&
            validSelectedSample &&
            (value.outcome === "selected" ||
                value.outcome === "no-samples" ||
                value.outcome === "no-matching-workout" ||
                value.outcome === "no-meaningful-workout")
        );
    }

    if (value.kind === "workout-query-error") {
        return (
            typeof value.targetDate === "string" &&
            (value.range === null || isWorkoutQueryRange(value.range)) &&
            typeof value.errorMessage === "string" &&
            (typeof value.nativeCode === "string" || value.nativeCode === null)
        );
    }

    if (value.kind === "workout-persistence") {
        return (
            typeof value.targetDate === "string" &&
            typeof value.saved === "boolean" &&
            (value.mode === "patched-existing-session" ||
                value.mode === "created-minimal-session" ||
                value.mode === "noop") &&
            (typeof value.selectedExternalId === "string" || value.selectedExternalId === null) &&
            (typeof value.errorMessage === "string" || value.errorMessage === null)
        );
    }

    if (value.kind === "cardio-inspection") {
        return (
            typeof value.targetDate === "string" &&
            typeof value.includeRoutes === "boolean" &&
            isFiniteNumber(value.existingSessionCount) &&
            isFiniteNumber(value.importedSessionCount) &&
            isFiniteNumber(value.mappedSessionCount) &&
            isFiniteNumber(value.routeSessionCount) &&
            isFiniteNumber(value.routePointCount) &&
            isFiniteNumber(value.sessionsStored) &&
            typeof value.sessionsTruncated === "boolean" &&
            Array.isArray(value.sessions)
        );
    }

    if (value.kind === "cardio-merge") {
        return (
            typeof value.targetDate === "string" &&
            isFiniteNumber(value.existingSessionCount) &&
            isFiniteNumber(value.mergedSessionCount) &&
            isFiniteNumber(value.insertedCount) &&
            isFiniteNumber(value.updatedCount) &&
            isFiniteNumber(value.unchangedCount) &&
            Array.isArray(value.operations)
        );
    }

    if (value.kind === "cardio-persistence") {
        return (
            typeof value.targetDate === "string" &&
            (value.operation === "create" || value.operation === "patch") &&
            (typeof value.sessionId === "string" || value.sessionId === null) &&
            (typeof value.externalId === "string" || value.externalId === null) &&
            typeof value.saved === "boolean" &&
            (isFiniteNumber(value.httpStatus) || value.httpStatus === null) &&
            (typeof value.apiCode === "string" || value.apiCode === null) &&
            typeof value.message === "string"
        );
    }

    if (value.kind === "cardio-sync-completed") {
        return (
            typeof value.targetDate === "string" &&
            isFiniteNumber(value.importedCount) &&
            isFiniteNumber(value.insertedCount) &&
            isFiniteNumber(value.updatedCount) &&
            isFiniteNumber(value.unchangedCount) &&
            isFiniteNumber(value.persistedCount) &&
            isFiniteNumber(value.routeSessionCount) &&
            isFiniteNumber(value.routePointCount)
        );
    }

    if (value.kind === "cardio-sync-error") {
        return (
            typeof value.targetDate === "string" &&
            (value.stage === "provider" ||
                value.stage === "inspection" ||
                value.stage === "merge" ||
                value.stage === "persistence" ||
                value.stage === "refresh") &&
            (isFiniteNumber(value.httpStatus) || value.httpStatus === null) &&
            (typeof value.apiCode === "string" || value.apiCode === null) &&
            typeof value.message === "string"
        );
    }

    return false;
}

function parseStoredEvents(value: string | null): HealthDiagnosticEvent[] {
    if (!value) return [];

    try {
        const parsed: unknown = JSON.parse(value);
        if (!Array.isArray(parsed)) return [];

        return parsed.filter(isHealthDiagnosticEvent).slice(-HEALTH_DIAGNOSTIC_MAX_EVENTS);
    } catch {
        return [];
    }
}

async function loadEventsFromStorage(): Promise<HealthDiagnosticEvent[]> {
    if (memoryEvents) {
        return [...memoryEvents];
    }

    try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        memoryEvents = parseStoredEvents(stored);
    } catch {
        memoryEvents = [];
    }

    return [...memoryEvents];
}

function notify(events: HealthDiagnosticEvent[]): void {
    const snapshot = [...events];
    for (const listener of listeners) {
        listener(snapshot);
    }
}

function trimEventsForStorage(events: HealthDiagnosticEvent[]): HealthDiagnosticEvent[] {
    const trimmed = events.slice(-HEALTH_DIAGNOSTIC_MAX_EVENTS);

    while (
        trimmed.length > 1 &&
        JSON.stringify(trimmed).length > MAX_STORAGE_CHARACTERS
    ) {
        trimmed.shift();
    }

    return trimmed;
}

async function persistEvents(events: HealthDiagnosticEvent[]): Promise<void> {
    memoryEvents = trimEventsForStorage(events);

    try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(memoryEvents));
    } catch {
        // The in-memory copy remains available for the current app session.
    }

    notify(memoryEvents);
}

/**
 * Returns diagnostics ordered from oldest to newest.
 */
export async function getHealthDiagnosticEvents(): Promise<HealthDiagnosticEvent[]> {
    return loadEventsFromStorage();
}

/**
 * Appends one event while serializing concurrent writes.
 */
export async function appendHealthDiagnosticEvent(
    event: HealthDiagnosticEvent
): Promise<void> {
    writeQueue = writeQueue
        .catch(() => undefined)
        .then(async () => {
            const current = await loadEventsFromStorage();
            await persistEvents([...current, event]);
        });

    return writeQueue;
}

export async function clearHealthDiagnosticEvents(): Promise<void> {
    writeQueue = writeQueue
        .catch(() => undefined)
        .then(async () => {
            memoryEvents = [];
            try {
                await AsyncStorage.removeItem(STORAGE_KEY);
            } catch {
                // The in-memory log is still cleared.
            }
            notify([]);
        });

    return writeQueue;
}

export function subscribeHealthDiagnosticEvents(
    listener: HealthDiagnosticListener
): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function createHealthDiagnosticId(prefix: string): string {
    const safePrefix = prefix.trim().replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
    const randomPart = Math.random().toString(36).slice(2, 10);
    return `${safePrefix || "health"}-${Date.now()}-${randomPart}`;
}

/**
 * Converts unknown native values into bounded JSON-safe diagnostic data.
 * Circular references, functions, symbols and excessively deep values are omitted.
 */
export function toHealthDiagnosticJson(
    input: unknown,
    depth = 0,
    seen: WeakSet<object> = new WeakSet<object>()
): HealthDiagnosticJsonValue | null {
    if (input === null) return null;

    if (typeof input === "string" || typeof input === "boolean") {
        return input;
    }

    if (typeof input === "number") {
        return Number.isFinite(input) ? input : String(input);
    }

    if (input instanceof Date) {
        return input.toISOString();
    }

    if (typeof input !== "object") {
        return null;
    }

    if (depth >= MAX_JSON_DEPTH) {
        return "[max-depth]";
    }

    if (seen.has(input)) {
        return "[circular]";
    }

    seen.add(input);

    if (Array.isArray(input)) {
        const out: HealthDiagnosticJsonValue[] = [];
        const limited = input.slice(0, MAX_ARRAY_ITEMS);

        for (const value of limited) {
            out.push(toHealthDiagnosticJson(value, depth + 1, seen));
        }

        if (input.length > MAX_ARRAY_ITEMS) {
            out.push(`[truncated:${input.length - MAX_ARRAY_ITEMS}]`);
        }

        return out;
    }

    const out: { [key: string]: HealthDiagnosticJsonValue } = {};
    const entries = Object.entries(input).slice(0, MAX_OBJECT_KEYS);

    for (const [key, value] of entries) {
        out[key] = toHealthDiagnosticJson(value, depth + 1, seen);
    }

    const totalKeys = Object.keys(input).length;
    if (totalKeys > MAX_OBJECT_KEYS) {
        out.__truncatedKeys = totalKeys - MAX_OBJECT_KEYS;
    }

    return out;
}

export function serializeHealthDiagnostics(events: HealthDiagnosticEvent[]): string {
    return JSON.stringify(
        {
            exportedAt: new Date().toISOString(),
            eventCount: events.length,
            warning:
                "Local Health diagnostics may contain dates, source names and reduced HealthKit sample data.",
            events,
        },
        null,
        2
    );
}
