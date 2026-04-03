// /src/services/health/outdoor/outdoorSync.service.ts

import {
    getOutdoorHealthProvider,
    readOutdoorSessions,
} from "@/src/services/health/outdoor/outdoorHealth.service";
import {
    getWorkoutDayServ,
    upsertWorkoutDay,
} from "@/src/services/workout/days.service";
import type {
    HealthImportedOutdoorQuery,
    HealthImportedOutdoorSession,
    OutdoorActivityType,
} from "@/src/types/health/healthOutdoor.types";
import type {
    ISODate,
    WorkoutDay,
    WorkoutDayUpsertBody,
    WorkoutSession,
} from "@/src/types/workoutDay.types";
import { mergeOutdoorSessionsIntoExistingSessions } from "@/src/utils/health/outdoor/outdoorSession.dedupe";
import { getOutdoorSessionsForDate } from "@/src/utils/health/outdoor/outdoorSession.grouping";
import { isOutdoorActivityType } from "@/src/utils/health/outdoor/outdoorSession.helpers";
import { mapImportedOutdoorSessionToWorkoutSession } from "@/src/utils/health/outdoor/outdoorSession.mapper";

export type OutdoorSyncDateInput = {
    date: ISODate;
    activityTypes?: OutdoorActivityType[];
    includeRoutes?: boolean;
};

export type OutdoorSessionDetailsInput = {
    date: ISODate;
    sessionId?: string;
    externalId?: string | null;
    includeRoutes?: boolean;
    activityTypes?: OutdoorActivityType[];
};

export type OutdoorSyncResult = {
    provider: "healthkit" | "health-connect";
    date: ISODate;

    importedCount: number;
    insertedCount: number;
    updatedCount: number;
    unchangedCount: number;

    importedSessions: HealthImportedOutdoorSession[];
    mappedSessions: WorkoutSession[];
    persistedSessions: WorkoutSession[];

    day: WorkoutDay | null;
};

export type OutdoorEnsureResult = OutdoorSyncResult & {
    hadExistingOutdoorSessions: boolean;
    skippedImport: boolean;
};

export type OutdoorSessionDetailsResult = {
    provider: "healthkit" | "health-connect";
    date: ISODate;

    matchedImportedSession: HealthImportedOutdoorSession | null;
    mappedSession: WorkoutSession | null;
    day: WorkoutDay | null;
    updated: boolean;
};

function extractHttpStatus(error: unknown): number | null {
    if (typeof error !== "object" || error === null) {
        return null;
    }

    if (
        "status" in error &&
        typeof (error as { status?: unknown }).status === "number"
    ) {
        return (error as { status: number }).status;
    }

    if (
        "response" in error &&
        typeof (error as { response?: unknown }).response === "object" &&
        (error as { response?: unknown }).response !== null &&
        "status" in ((error as { response: { status?: unknown } }).response) &&
        typeof (error as { response: { status?: unknown } }).response.status === "number"
    ) {
        return (error as { response: { status: number } }).response.status;
    }

    return null;
}

function normalizeActivityTypes(
    activityTypes?: OutdoorActivityType[]
): OutdoorActivityType[] {
    if (Array.isArray(activityTypes) && activityTypes.length > 0) {
        return activityTypes.filter((item): item is OutdoorActivityType =>
            isOutdoorActivityType(item)
        );
    }

    return ["walking", "running"];
}

async function buildOutdoorReadQuery(
    input: OutdoorSyncDateInput
): Promise<HealthImportedOutdoorQuery & { includeRoutes?: boolean }> {
    const provider = await getOutdoorHealthProvider();

    if (!provider) {
        throw new Error("Outdoor provider is not available for the current platform.");
    }

    return {
        provider,
        date: input.date,
        activityTypes: normalizeActivityTypes(input.activityTypes),
        includeRoutes: input.includeRoutes ?? false,
    };
}

function getExistingSessions(day: WorkoutDay | null): WorkoutSession[] {
    const sessions = day?.training?.sessions ?? null;
    return Array.isArray(sessions) ? sessions : [];
}

function getExistingOutdoorSessions(
    day: WorkoutDay | null,
    date: ISODate,
    activityTypes?: OutdoorActivityType[]
): WorkoutSession[] {
    return getOutdoorSessionsForDate(
        getExistingSessions(day),
        date,
        normalizeActivityTypes(activityTypes)
    );
}

function getExistingOutdoorImportedSessions(
    day: WorkoutDay | null,
    date: ISODate,
    activityTypes?: OutdoorActivityType[]
): WorkoutSession[] {
    return getExistingOutdoorSessions(day, date, activityTypes).filter((session) => {
        const source = session.meta?.source ?? null;
        const sessionKind = session.meta?.sessionKind ?? null;

        return (
            sessionKind === "device-import" &&
            (source === "healthkit" || source === "health-connect")
        );
    });
}

async function safeGetWorkoutDay(date: ISODate): Promise<WorkoutDay | null> {
    try {
        return await getWorkoutDayServ(date);
    } catch (error: unknown) {
        const maybeStatus = extractHttpStatus(error);

        if (maybeStatus === 404) {
            return null;
        }

        throw error;
    }
}

function buildTrainingPayload(
    existingDay: WorkoutDay | null,
    mergedSessions: WorkoutSession[]
): WorkoutDayUpsertBody {
    return {
        training: {
            source: existingDay?.training?.source ?? null,
            dayEffortRpe: existingDay?.training?.dayEffortRpe ?? null,
            raw: existingDay?.training?.raw ?? null,
            sessions: mergedSessions,
        },
    };
}

function findImportedSessionMatch(
    importedSessions: HealthImportedOutdoorSession[],
    existingSessions: WorkoutSession[],
    input: OutdoorSessionDetailsInput
): HealthImportedOutdoorSession | null {
    if (input.externalId && input.externalId.trim().length > 0) {
        return (
            importedSessions.find(
                (session) => (session.externalId ?? "").trim() === input.externalId?.trim()
            ) ?? null
        );
    }

    if (input.sessionId && input.sessionId.trim().length > 0) {
        const matchedExisting =
            existingSessions.find((session) => session.id === input.sessionId) ?? null;

        if (!matchedExisting) {
            return null;
        }

        const matchedExistingExternalId = matchedExisting.meta?.externalId ?? null;

        if (matchedExistingExternalId) {
            return (
                importedSessions.find(
                    (session) =>
                        (session.externalId ?? "").trim() === matchedExistingExternalId.trim()
                ) ?? null
            );
        }

        return (
            importedSessions.find((session) => {
                const mapped = mapImportedOutdoorSessionToWorkoutSession(session);

                return (
                    mapped.activityType === matchedExisting.activityType &&
                    mapped.startAt === matchedExisting.startAt &&
                    mapped.endAt === matchedExisting.endAt &&
                    mapped.distanceKm === matchedExisting.distanceKm
                );
            }) ?? null
        );
    }

    return importedSessions[0] ?? null;
}

export async function syncOutdoorSessionsForDate(
    input: OutdoorSyncDateInput
): Promise<OutdoorSyncResult> {
    const readQuery = await buildOutdoorReadQuery(input);
    const readResult = await readOutdoorSessions(readQuery);

    const importedSessions = readResult.sessions.filter(
        (session) => session.date === input.date
    );

    const mappedSessions = importedSessions.map((session) =>
        mapImportedOutdoorSessionToWorkoutSession(session)
    );

    const existingDay = await safeGetWorkoutDay(input.date);
    const existingSessions = getExistingSessions(existingDay);

    /**
     * If provider returned nothing and there is no existing day,
     * avoid a no-op upsert request entirely.
     */
    if (importedSessions.length === 0 && existingDay === null) {
        return {
            provider: readResult.provider,
            date: input.date,
            importedCount: 0,
            insertedCount: 0,
            updatedCount: 0,
            unchangedCount: 0,
            importedSessions: [],
            mappedSessions: [],
            persistedSessions: [],
            day: null,
        };
    }

    /**
     * If provider returned nothing but the day already exists,
     * keep the existing outdoor sessions and skip unnecessary upsert.
     */
    if (importedSessions.length === 0 && existingDay !== null) {
        return {
            provider: readResult.provider,
            date: input.date,
            importedCount: 0,
            insertedCount: 0,
            updatedCount: 0,
            unchangedCount: getExistingOutdoorSessions(
                existingDay,
                input.date,
                input.activityTypes
            ).length,
            importedSessions: [],
            mappedSessions: [],
            persistedSessions: getExistingSessions(existingDay),
            day: existingDay,
        };
    }

    const mergeResult = mergeOutdoorSessionsIntoExistingSessions(
        existingSessions,
        importedSessions
    );

    /**
     * If merge produced no effective changes and we already have a day,
     * avoid a no-op write.
     */
    if (
        existingDay !== null &&
        mergeResult.insertedCount === 0 &&
        mergeResult.updatedCount === 0
    ) {
        return {
            provider: readResult.provider,
            date: input.date,
            importedCount: importedSessions.length,
            insertedCount: 0,
            updatedCount: 0,
            unchangedCount: mergeResult.unchangedCount,
            importedSessions,
            mappedSessions,
            persistedSessions: mergeResult.mergedSessions,
            day: existingDay,
        };
    }

    const day = await upsertWorkoutDay(
        input.date,
        buildTrainingPayload(existingDay, mergeResult.mergedSessions),
        "merge"
    );

    return {
        provider: readResult.provider,
        date: input.date,

        importedCount: importedSessions.length,
        insertedCount: mergeResult.insertedCount,
        updatedCount: mergeResult.updatedCount,
        unchangedCount: mergeResult.unchangedCount,

        importedSessions,
        mappedSessions,
        persistedSessions: mergeResult.mergedSessions,

        day,
    };
}

export async function bootstrapOutdoorSessionsForDate(
    input: OutdoorSyncDateInput
): Promise<OutdoorSyncResult> {
    return syncOutdoorSessionsForDate({
        ...input,
        includeRoutes: input.includeRoutes ?? false,
    });
}

export async function ensureOutdoorSessionsForDate(
    input: OutdoorSyncDateInput
): Promise<OutdoorEnsureResult> {
    const existingDay = await safeGetWorkoutDay(input.date);

    /**
     * For screen bootstrap, any outdoor session already present for the day
     * should prevent automatic re-import.
     *
     * This includes:
     * - imported device sessions
     * - manual outdoor fallback sessions
     *
     * Explicit re-fetch remains available via "Resync".
     */
    const existingOutdoorSessions = getExistingOutdoorSessions(
        existingDay,
        input.date,
        input.activityTypes
    );

    if (existingOutdoorSessions.length > 0) {
        return {
            provider: (await getOutdoorHealthProvider()) ?? "healthkit",
            date: input.date,

            importedCount: 0,
            insertedCount: 0,
            updatedCount: 0,
            unchangedCount: existingOutdoorSessions.length,

            importedSessions: [],
            mappedSessions: [],
            persistedSessions: existingOutdoorSessions,

            day: existingDay,

            hadExistingOutdoorSessions: true,
            skippedImport: true,
        };
    }

    const existingImportedSessions = getExistingOutdoorImportedSessions(
        existingDay,
        input.date,
        input.activityTypes
    );

    if (existingImportedSessions.length > 0) {
        return {
            provider: (await getOutdoorHealthProvider()) ?? "healthkit",
            date: input.date,

            importedCount: 0,
            insertedCount: 0,
            updatedCount: 0,
            unchangedCount: existingImportedSessions.length,

            importedSessions: [],
            mappedSessions: [],
            persistedSessions: existingImportedSessions,

            day: existingDay,

            hadExistingOutdoorSessions: true,
            skippedImport: true,
        };
    }

    const synced = await syncOutdoorSessionsForDate(input);

    return {
        ...synced,
        hadExistingOutdoorSessions: false,
        skippedImport: false,
    };
}

export async function syncOutdoorSessionDetails(
    input: OutdoorSessionDetailsInput
): Promise<OutdoorSessionDetailsResult> {
    const existingDay = await safeGetWorkoutDay(input.date);
    const existingSessions = getExistingSessions(existingDay);

    const readQuery = await buildOutdoorReadQuery({
        date: input.date,
        includeRoutes: input.includeRoutes ?? true,
        activityTypes: input.activityTypes,
    });

    const readResult = await readOutdoorSessions({
        ...readQuery,
        includeRoutes: input.includeRoutes ?? true,
    });

    const importedSessions = readResult.sessions.filter(
        (session) => session.date === input.date
    );

    const matchedImportedSession = findImportedSessionMatch(
        importedSessions,
        existingSessions,
        input
    );

    if (!matchedImportedSession) {
        return {
            provider: readResult.provider,
            date: input.date,
            matchedImportedSession: null,
            mappedSession: null,
            day: existingDay,
            updated: false,
        };
    }

    const mappedSession = mapImportedOutdoorSessionToWorkoutSession(
        matchedImportedSession
    );

    const mergeResult = mergeOutdoorSessionsIntoExistingSessions(existingSessions, [
        matchedImportedSession,
    ]);

    if (
        existingDay !== null &&
        mergeResult.insertedCount === 0 &&
        mergeResult.updatedCount === 0
    ) {
        return {
            provider: readResult.provider,
            date: input.date,
            matchedImportedSession,
            mappedSession,
            day: existingDay,
            updated: false,
        };
    }

    const day = await upsertWorkoutDay(
        input.date,
        buildTrainingPayload(existingDay, mergeResult.mergedSessions),
        "merge"
    );

    return {
        provider: readResult.provider,
        date: input.date,
        matchedImportedSession,
        mappedSession,
        day,
        updated: mergeResult.insertedCount > 0 || mergeResult.updatedCount > 0,
    };
}