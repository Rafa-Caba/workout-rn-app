// /src/services/health/cardio/cardioSync.service.ts

import {
    getCardioHealthProvider,
    readCardioSessions,
} from "@/src/services/health/cardio/cardioHealth.service";
import {
    getWorkoutDayServ,
    upsertWorkoutDay,
} from "@/src/services/workout/days.service";
import type {
    HealthImportedCardioQuery,
    HealthImportedCardioSession,
    CardioActivityType,
} from "@/src/types/health/healthCardio.types";
import type {
    ISODate,
    WorkoutCardioEnvironment,
    WorkoutDay,
    WorkoutDayUpsertBody,
    WorkoutSession,
} from "@/src/types/workoutDay.types";
import { mergeCardioSessionsIntoExistingSessions } from "@/src/utils/health/cardio/cardioSession.dedupe";
import { getCardioSessionsForDate } from "@/src/utils/health/cardio/cardioSession.grouping";
import { isCardioActivityType } from "@/src/utils/health/cardio/cardioSession.helpers";
import { mapImportedCardioSessionToWorkoutSession } from "@/src/utils/health/cardio/cardioSession.mapper";

export type CardioSyncDateInput = {
    date: ISODate;
    activityTypes?: CardioActivityType[];
    cardioEnvironments?: Exclude<WorkoutCardioEnvironment, null>[];
    includeRoutes?: boolean;
};

export type CardioSessionDetailsInput = {
    date: ISODate;
    sessionId?: string;
    externalId?: string | null;
    includeRoutes?: boolean;
    activityTypes?: CardioActivityType[];
    cardioEnvironments?: Exclude<WorkoutCardioEnvironment, null>[];
};

export type CardioSyncResult = {
    provider: "healthkit" | "health-connect";
    date: ISODate;

    importedCount: number;
    insertedCount: number;
    updatedCount: number;
    unchangedCount: number;

    importedSessions: HealthImportedCardioSession[];
    mappedSessions: WorkoutSession[];
    persistedSessions: WorkoutSession[];

    day: WorkoutDay | null;
};

export type CardioEnsureResult = CardioSyncResult & {
    hadExistingCardioSessions: boolean;
    skippedImport: boolean;
};

export type CardioSessionDetailsResult = {
    provider: "healthkit" | "health-connect";
    date: ISODate;

    matchedImportedSession: HealthImportedCardioSession | null;
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
    activityTypes?: CardioActivityType[]
): CardioActivityType[] {
    if (Array.isArray(activityTypes) && activityTypes.length > 0) {
        return activityTypes.filter((item): item is CardioActivityType =>
            isCardioActivityType(item)
        );
    }

    return ["walking", "running"];
}

async function buildCardioReadQuery(
    input: CardioSyncDateInput
): Promise<HealthImportedCardioQuery & { includeRoutes?: boolean }> {
    const provider = await getCardioHealthProvider();

    if (!provider) {
        throw new Error("Cardio provider is not available for the current platform.");
    }

    return {
        provider,
        date: input.date,
        activityTypes: normalizeActivityTypes(input.activityTypes),
        cardioEnvironments: input.cardioEnvironments,
        includeRoutes: input.includeRoutes ?? false,
    };
}

function getExistingSessions(day: WorkoutDay | null): WorkoutSession[] {
    const sessions = day?.training?.sessions ?? null;
    return Array.isArray(sessions) ? sessions : [];
}

function getExistingCardioSessions(
    day: WorkoutDay | null,
    date: ISODate,
    activityTypes?: CardioActivityType[],
    cardioEnvironments?: Exclude<WorkoutCardioEnvironment, null>[]
): WorkoutSession[] {
    return getCardioSessionsForDate(
        getExistingSessions(day),
        date,
        normalizeActivityTypes(activityTypes),
        cardioEnvironments
    );
}

function getExistingCardioImportedSessions(
    day: WorkoutDay | null,
    date: ISODate,
    activityTypes?: CardioActivityType[],
    cardioEnvironments?: Exclude<WorkoutCardioEnvironment, null>[]
): WorkoutSession[] {
    return getExistingCardioSessions(day, date, activityTypes, cardioEnvironments).filter((session) => {
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
    importedSessions: HealthImportedCardioSession[],
    existingSessions: WorkoutSession[],
    input: CardioSessionDetailsInput
): HealthImportedCardioSession | null {
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
                const mapped = mapImportedCardioSessionToWorkoutSession(session);

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

export async function syncCardioSessionsForDate(
    input: CardioSyncDateInput
): Promise<CardioSyncResult> {
    const readQuery = await buildCardioReadQuery(input);
    const readResult = await readCardioSessions(readQuery);

    const importedSessions = readResult.sessions.filter(
        (session) => session.date === input.date
    );

    const mappedSessions = importedSessions.map((session) =>
        mapImportedCardioSessionToWorkoutSession(session)
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
     * keep the existing cardio sessions and skip unnecessary upsert.
     */
    if (importedSessions.length === 0 && existingDay !== null) {
        return {
            provider: readResult.provider,
            date: input.date,
            importedCount: 0,
            insertedCount: 0,
            updatedCount: 0,
            unchangedCount: getExistingCardioSessions(
                existingDay,
                input.date,
                input.activityTypes,
                input.cardioEnvironments
            ).length,
            importedSessions: [],
            mappedSessions: [],
            persistedSessions: getExistingSessions(existingDay),
            day: existingDay,
        };
    }

    const mergeResult = mergeCardioSessionsIntoExistingSessions(
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

export async function bootstrapCardioSessionsForDate(
    input: CardioSyncDateInput
): Promise<CardioSyncResult> {
    return syncCardioSessionsForDate({
        ...input,
        includeRoutes: input.includeRoutes ?? false,
    });
}

export async function ensureCardioSessionsForDate(
    input: CardioSyncDateInput
): Promise<CardioEnsureResult> {
    const existingDay = await safeGetWorkoutDay(input.date);

    /**
     * For screen bootstrap, any cardio session already present for the day
     * should prevent automatic re-import.
     *
     * This includes:
     * - imported device sessions
     * - manual cardio fallback sessions
     *
     * Explicit re-fetch remains available via "Resync".
     */
    const existingCardioSessions = getExistingCardioSessions(
        existingDay,
        input.date,
        input.activityTypes,
        input.cardioEnvironments
    );

    if (existingCardioSessions.length > 0) {
        return {
            provider: (await getCardioHealthProvider()) ?? "healthkit",
            date: input.date,

            importedCount: 0,
            insertedCount: 0,
            updatedCount: 0,
            unchangedCount: existingCardioSessions.length,

            importedSessions: [],
            mappedSessions: [],
            persistedSessions: existingCardioSessions,

            day: existingDay,

            hadExistingCardioSessions: true,
            skippedImport: true,
        };
    }

    const existingImportedSessions = getExistingCardioImportedSessions(
        existingDay,
        input.date,
        input.activityTypes,
        input.cardioEnvironments
    );

    if (existingImportedSessions.length > 0) {
        return {
            provider: (await getCardioHealthProvider()) ?? "healthkit",
            date: input.date,

            importedCount: 0,
            insertedCount: 0,
            updatedCount: 0,
            unchangedCount: existingImportedSessions.length,

            importedSessions: [],
            mappedSessions: [],
            persistedSessions: existingImportedSessions,

            day: existingDay,

            hadExistingCardioSessions: true,
            skippedImport: true,
        };
    }

    const synced = await syncCardioSessionsForDate(input);

    return {
        ...synced,
        hadExistingCardioSessions: false,
        skippedImport: false,
    };
}

export async function syncCardioSessionDetails(
    input: CardioSessionDetailsInput
): Promise<CardioSessionDetailsResult> {
    const existingDay = await safeGetWorkoutDay(input.date);
    const existingSessions = getExistingSessions(existingDay);

    const readQuery = await buildCardioReadQuery({
        date: input.date,
        includeRoutes: input.includeRoutes ?? true,
        activityTypes: input.activityTypes,
        cardioEnvironments: input.cardioEnvironments,
    });

    const readResult = await readCardioSessions({
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

    const mappedSession = mapImportedCardioSessionToWorkoutSession(
        matchedImportedSession
    );

    const mergeResult = mergeCardioSessionsIntoExistingSessions(existingSessions, [
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
