// src/services/health/cardio/cardioSync.service.ts
// Imports cardio from Health, diagnoses the read/merge/persistence pipeline,
// and persists only the affected sessions through dedicated CRUD endpoints.

import { Platform } from "react-native";

import {
    getCardioHealthProvider,
    readCardioSessions,
} from "@/src/services/health/cardio/cardioHealth.service";
import {
    appendHealthDiagnosticEvent,
    createHealthDiagnosticId,
    toHealthDiagnosticJson,
} from "@/src/services/health/diagnostics/healthDiagnostics.service";
import { getWorkoutDayServ } from "@/src/services/workout/days.service";
import {
    createSession,
    ensureWorkoutDayExists,
    patchSession,
} from "@/src/services/workout/sessions.service";
import type { HealthProvider } from "@/src/types/health/cardio/health.types";
import type {
    CardioActivityType,
    HealthImportedCardioQuery,
    HealthImportedCardioSession,
} from "@/src/types/health/cardio/healthCardio.types";
import type {
    ISODate,
    WorkoutCardioEnvironment,
    WorkoutDay,
    WorkoutSession,
} from "@/src/types/workoutDay.types";
import { normalizeApiError } from "@/src/utils/api/apiErrorMessage";
import {
    toHealthCardioDiagnosticSession,
    toHealthCardioPersistenceOperation,
} from "@/src/utils/health/cardio/cardioDiagnostics.mapper";
import { mergeCardioSessionsIntoExistingSessions } from "@/src/utils/health/cardio/cardioSession.dedupe";
import { getCardioSessionsForDate } from "@/src/utils/health/cardio/cardioSession.grouping";
import { isCardioActivityType } from "@/src/utils/health/cardio/cardioSession.helpers";
import { mapImportedCardioSessionToWorkoutSession } from "@/src/utils/health/cardio/cardioSession.mapper";
import {
    areCardioSessionPayloadsEqual,
    toCardioCreateSessionBody,
    toCardioPatchSessionBody,
} from "@/src/utils/health/cardio/cardioSessionPayload.mapper";

const MAX_DIAGNOSTIC_CARDIO_SESSIONS = 20;

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

export type CardioInspectionResult = {
    provider: HealthProvider;
    date: ISODate;
    includeRoutes: boolean;
    importedSessions: HealthImportedCardioSession[];
    mappedSessions: WorkoutSession[];
    existingDay: WorkoutDay | null;
    existingSessions: WorkoutSession[];
    routeSessionCount: number;
    routePointCount: number;
};

export type CardioSyncResult = {
    provider: HealthProvider;
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
    provider: HealthProvider;
    date: ISODate;

    matchedImportedSession: HealthImportedCardioSession | null;
    mappedSession: WorkoutSession | null;
    day: WorkoutDay | null;
    updated: boolean;
};

type CardioPersistencePlanItem = {
    operation: "create" | "patch";
    sessionId: string | null;
    session: WorkoutSession;
};

type CardioPersistenceExecution = {
    operation: "create" | "patch";
    sessionId: string | null;
    recoveredFromStaleSessionId: boolean;
};

type CardioDiagnosticStage =
    | "provider"
    | "inspection"
    | "merge"
    | "persistence"
    | "refresh";

function toIsoNow(): string {
    return new Date().toISOString();
}

function resolveFallbackProvider(): HealthProvider {
    return Platform.OS === "android" ? "health-connect" : "healthkit";
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
): Promise<HealthImportedCardioQuery & { includeRoutes: boolean }> {
    const provider = await getCardioHealthProvider();

    if (!provider) {
        throw new Error("Cardio no está disponible para la plataforma actual.");
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

async function safeGetWorkoutDay(date: ISODate): Promise<WorkoutDay | null> {
    try {
        return await getWorkoutDayServ(date);
    } catch (error: unknown) {
        const normalized = normalizeApiError(error);

        if (normalized.status === 404) {
            return null;
        }

        throw error;
    }
}

function countRoutes(sessions: HealthImportedCardioSession[]): {
    routeSessionCount: number;
    routePointCount: number;
} {
    let routeSessionCount = 0;
    let routePointCount = 0;

    for (const session of sessions) {
        const pointCount = session.route?.points?.length ?? 0;
        const summaryCount = session.route?.routeSummary?.pointCount ?? 0;
        const effectivePointCount = Math.max(pointCount, summaryCount);

        if (session.route?.hasRoute === true || effectivePointCount > 0) {
            routeSessionCount += 1;
        }

        routePointCount += effectivePointCount;
    }

    return { routeSessionCount, routePointCount };
}

async function appendCardioSyncError(input: {
    provider: HealthProvider;
    date: ISODate;
    stage: CardioDiagnosticStage;
    error: unknown;
    payload?: unknown;
}): Promise<void> {
    const normalized = normalizeApiError(input.error);

    await appendHealthDiagnosticEvent({
        id: createHealthDiagnosticId("cardio-sync-error"),
        createdAt: toIsoNow(),
        provider: input.provider,
        level: "error",
        kind: "cardio-sync-error",
        targetDate: input.date,
        stage: input.stage,
        httpStatus: normalized.status,
        apiCode: normalized.code,
        message: normalized.message,
        validationDetails: toHealthDiagnosticJson(normalized.details),
        payload: toHealthDiagnosticJson(input.payload ?? null),
    });
}

function buildPersistencePlan(
    existingSessions: WorkoutSession[],
    mergedSessions: WorkoutSession[]
): CardioPersistencePlanItem[] {
    const existingById = new Map<string, WorkoutSession>();

    for (const session of existingSessions) {
        existingById.set(session.id, session);
    }

    const operations: CardioPersistencePlanItem[] = [];

    for (const mergedSession of mergedSessions) {
        const existingSession = existingById.get(mergedSession.id) ?? null;

        if (!existingSession) {
            operations.push({
                operation: "create",
                sessionId: null,
                session: mergedSession,
            });
            continue;
        }

        if (!areCardioSessionPayloadsEqual(existingSession, mergedSession)) {
            operations.push({
                operation: "patch",
                sessionId: existingSession.id,
                session: mergedSession,
            });
        }
    }

    return operations;
}

function getStableExternalIds(session: WorkoutSession): string[] {
    const candidates = [session.meta?.externalId, session.meta?.healthExternalId];

    return Array.from(
        new Set(
            candidates
                .filter((value): value is string => typeof value === "string")
                .map((value) => value.trim())
                .filter((value) => value.length > 0)
        )
    );
}

function findSessionByStableIdentity(
    sessions: WorkoutSession[],
    target: WorkoutSession
): WorkoutSession | null {
    const targetExternalIds = new Set(getStableExternalIds(target));

    if (targetExternalIds.size > 0) {
        const externalIdMatch = sessions.find((session) =>
            getStableExternalIds(session).some((externalId) =>
                targetExternalIds.has(externalId)
            )
        );

        if (externalIdMatch) {
            return externalIdMatch;
        }
    }

    const exactIdMatch = sessions.find((session) => session.id === target.id) ?? null;
    if (exactIdMatch) {
        return exactIdMatch;
    }

    return (
        sessions.find((session) => {
            const sameActivity = session.activityType === target.activityType;
            const sameStart = session.startAt === target.startAt;
            const sameEnd = session.endAt === target.endAt;
            const sameDuration = session.durationSeconds === target.durationSeconds;

            return sameActivity && sameStart && (sameEnd || sameDuration);
        }) ?? null
    );
}

async function ensureCardioWorkoutDay(date: ISODate): Promise<WorkoutDay> {
    const currentDay = await safeGetWorkoutDay(date);
    if (currentDay) {
        return currentDay;
    }

    await ensureWorkoutDayExists(date);

    const createdDay = await safeGetWorkoutDay(date);
    if (!createdDay) {
        throw new Error("No se pudo crear o recuperar el WorkoutDay para Cardio.");
    }

    return createdDay;
}

async function createCardioSessionWithDayRecovery(input: {
    date: ISODate;
    session: WorkoutSession;
}): Promise<CardioPersistenceExecution> {
    const payload = toCardioCreateSessionBody(input.session);

    try {
        await createSession(input.date, payload, { returnMode: "session" });
    } catch (error: unknown) {
        const normalized = normalizeApiError(error);

        if (normalized.status !== 404) {
            throw error;
        }

        await ensureCardioWorkoutDay(input.date);
        await createSession(input.date, payload, { returnMode: "session" });
    }

    return {
        operation: "create",
        sessionId: null,
        recoveredFromStaleSessionId: false,
    };
}

async function persistCardioOperation(input: {
    date: ISODate;
    item: CardioPersistencePlanItem;
}): Promise<CardioPersistenceExecution> {
    if (input.item.operation === "create") {
        return createCardioSessionWithDayRecovery({
            date: input.date,
            session: input.item.session,
        });
    }

    const initialSessionId = input.item.sessionId;
    if (!initialSessionId) {
        throw new Error("No se encontró el ID requerido para actualizar la sesión.");
    }

    const payload = toCardioPatchSessionBody(input.item.session);

    try {
        await patchSession(input.date, initialSessionId, payload, {
            returnMode: "session",
        });

        return {
            operation: "patch",
            sessionId: initialSessionId,
            recoveredFromStaleSessionId: false,
        };
    } catch (error: unknown) {
        const normalized = normalizeApiError(error);

        if (normalized.status !== 404) {
            throw error;
        }

        const refreshedDay = await safeGetWorkoutDay(input.date);
        const refreshedSessions = getExistingSessions(refreshedDay);
        const refreshedMatch = findSessionByStableIdentity(
            refreshedSessions,
            input.item.session
        );

        if (refreshedMatch) {
            await patchSession(input.date, refreshedMatch.id, payload, {
                returnMode: "session",
            });

            return {
                operation: "patch",
                sessionId: refreshedMatch.id,
                recoveredFromStaleSessionId: refreshedMatch.id !== initialSessionId,
            };
        }

        const created = await createCardioSessionWithDayRecovery({
            date: input.date,
            session: input.item.session,
        });

        return {
            ...created,
            recoveredFromStaleSessionId: true,
        };
    }
}

async function persistCardioOperations(input: {
    provider: HealthProvider;
    date: ISODate;
    operations: CardioPersistencePlanItem[];
}): Promise<CardioPersistenceExecution[]> {
    const executions: CardioPersistenceExecution[] = [];

    for (const item of input.operations) {
        const payloadForDiagnostics =
            item.operation === "create"
                ? toCardioCreateSessionBody(item.session)
                : toCardioPatchSessionBody(item.session);

        try {
            const execution = await persistCardioOperation({
                date: input.date,
                item,
            });
            executions.push(execution);

            await appendHealthDiagnosticEvent({
                id: createHealthDiagnosticId("cardio-persistence"),
                createdAt: toIsoNow(),
                provider: input.provider,
                level: "info",
                kind: "cardio-persistence",
                targetDate: input.date,
                operation: execution.operation,
                sessionId: execution.sessionId,
                externalId:
                    typeof item.session.meta?.externalId === "string"
                        ? item.session.meta.externalId
                        : null,
                saved: true,
                httpStatus: null,
                apiCode: null,
                message: execution.recoveredFromStaleSessionId
                    ? execution.operation === "patch"
                        ? "Sesión de cardio actualizada tras refrescar su ID."
                        : "Sesión de cardio recreada tras detectar un ID obsoleto."
                    : execution.operation === "create"
                        ? "Sesión de cardio creada."
                        : "Sesión de cardio actualizada.",
                validationDetails: null,
                payload: toHealthDiagnosticJson(payloadForDiagnostics),
            });
        } catch (error: unknown) {
            const normalized = normalizeApiError(error);

            await appendHealthDiagnosticEvent({
                id: createHealthDiagnosticId("cardio-persistence"),
                createdAt: toIsoNow(),
                provider: input.provider,
                level: "error",
                kind: "cardio-persistence",
                targetDate: input.date,
                operation: item.operation,
                sessionId: item.sessionId,
                externalId:
                    typeof item.session.meta?.externalId === "string"
                        ? item.session.meta.externalId
                        : null,
                saved: false,
                httpStatus: normalized.status,
                apiCode: normalized.code,
                message: normalized.message,
                validationDetails: toHealthDiagnosticJson(normalized.details),
                payload: toHealthDiagnosticJson(payloadForDiagnostics),
            });

            await appendCardioSyncError({
                provider: input.provider,
                date: input.date,
                stage: "persistence",
                error,
                payload: payloadForDiagnostics,
            });

            throw error;
        }
    }

    return executions;
}

function findImportedSessionMatch(
    importedSessions: HealthImportedCardioSession[],
    existingSessions: WorkoutSession[],
    input: CardioSessionDetailsInput
): HealthImportedCardioSession | null {
    const externalId = input.externalId?.trim() ?? "";

    if (externalId.length > 0) {
        return (
            importedSessions.find(
                (session) => (session.externalId ?? "").trim() === externalId
            ) ?? null
        );
    }

    const sessionId = input.sessionId?.trim() ?? "";

    if (sessionId.length > 0) {
        const matchedExisting =
            existingSessions.find((session) => session.id === sessionId) ?? null;

        if (!matchedExisting) {
            return null;
        }

        const matchedExistingExternalId = matchedExisting.meta?.externalId;

        if (
            typeof matchedExistingExternalId === "string" &&
            matchedExistingExternalId.trim().length > 0
        ) {
            const normalizedExistingExternalId = matchedExistingExternalId.trim();
            return (
                importedSessions.find(
                    (session) =>
                        (session.externalId ?? "").trim() === normalizedExistingExternalId
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

/**
 * Reads and normalizes cardio for one date without mutating the backend.
 * A bounded local event keeps the native/mapped evidence for troubleshooting.
 */
export async function inspectCardioSessionsForDate(
    input: CardioSyncDateInput
): Promise<CardioInspectionResult> {
    let provider = resolveFallbackProvider();
    let readQuery: HealthImportedCardioQuery & { includeRoutes: boolean };

    try {
        readQuery = await buildCardioReadQuery(input);
        provider = readQuery.provider;
    } catch (error: unknown) {
        await appendCardioSyncError({
            provider,
            date: input.date,
            stage: "provider",
            error,
        });
        throw error;
    }

    try {
        const readResult = await readCardioSessions(readQuery);
        const importedSessions = readResult.sessions.filter(
            (session) => session.date === input.date
        );
        const mappedSessions = importedSessions.map((session) =>
            mapImportedCardioSessionToWorkoutSession(session)
        );
        const existingDay = await safeGetWorkoutDay(input.date);
        const existingSessions = getExistingSessions(existingDay);
        const routeCounts = countRoutes(importedSessions);
        const diagnosticSessions = importedSessions
            .slice(0, MAX_DIAGNOSTIC_CARDIO_SESSIONS)
            .map(toHealthCardioDiagnosticSession);

        await appendHealthDiagnosticEvent({
            id: createHealthDiagnosticId("cardio-inspection"),
            createdAt: toIsoNow(),
            provider,
            level: importedSessions.length > 0 ? "info" : "warning",
            kind: "cardio-inspection",
            targetDate: input.date,
            includeRoutes: readQuery.includeRoutes,
            existingSessionCount: existingSessions.length,
            importedSessionCount: importedSessions.length,
            mappedSessionCount: mappedSessions.length,
            routeSessionCount: routeCounts.routeSessionCount,
            routePointCount: routeCounts.routePointCount,
            sessionsStored: diagnosticSessions.length,
            sessionsTruncated: importedSessions.length > diagnosticSessions.length,
            sessions: diagnosticSessions,
        });

        return {
            provider,
            date: input.date,
            includeRoutes: readQuery.includeRoutes,
            importedSessions,
            mappedSessions,
            existingDay,
            existingSessions,
            routeSessionCount: routeCounts.routeSessionCount,
            routePointCount: routeCounts.routePointCount,
        };
    } catch (error: unknown) {
        await appendCardioSyncError({
            provider,
            date: input.date,
            stage: "inspection",
            error,
        });
        throw error;
    }
}

export async function syncCardioSessionsForDate(
    input: CardioSyncDateInput
): Promise<CardioSyncResult> {
    const inspection = await inspectCardioSessionsForDate(input);
    const { importedSessions, mappedSessions } = inspection;

    if (importedSessions.length === 0) {
        const persistedSessions = getExistingCardioSessions(
            inspection.existingDay,
            input.date,
            input.activityTypes,
            input.cardioEnvironments
        );

        await appendHealthDiagnosticEvent({
            id: createHealthDiagnosticId("cardio-sync-completed"),
            createdAt: toIsoNow(),
            provider: inspection.provider,
            level: "warning",
            kind: "cardio-sync-completed",
            targetDate: input.date,
            importedCount: 0,
            insertedCount: 0,
            updatedCount: 0,
            unchangedCount: persistedSessions.length,
            persistedCount: persistedSessions.length,
            routeSessionCount: 0,
            routePointCount: 0,
        });

        return {
            provider: inspection.provider,
            date: input.date,
            importedCount: 0,
            insertedCount: 0,
            updatedCount: 0,
            unchangedCount: persistedSessions.length,
            importedSessions: [],
            mappedSessions: [],
            persistedSessions,
            day: inspection.existingDay,
        };
    }

    let workingDay = inspection.existingDay;

    try {
        if (!workingDay) {
            workingDay = await ensureCardioWorkoutDay(input.date);
        }
    } catch (error: unknown) {
        await appendCardioSyncError({
            provider: inspection.provider,
            date: input.date,
            stage: "persistence",
            error,
            payload: { operation: "ensure-workout-day" },
        });
        throw error;
    }

    const existingSessions = getExistingSessions(workingDay);
    let mergeResult: ReturnType<typeof mergeCardioSessionsIntoExistingSessions>;
    let operations: CardioPersistencePlanItem[];

    try {
        mergeResult = mergeCardioSessionsIntoExistingSessions(
            existingSessions,
            importedSessions
        );
        operations = buildPersistencePlan(
            existingSessions,
            mergeResult.mergedSessions
        );
    } catch (error: unknown) {
        await appendCardioSyncError({
            provider: inspection.provider,
            date: input.date,
            stage: "merge",
            error,
        });
        throw error;
    }

    const plannedInsertedCount = operations.filter(
        (operation) => operation.operation === "create"
    ).length;
    const plannedUpdatedCount = operations.filter(
        (operation) => operation.operation === "patch"
    ).length;
    const unchangedCount = Math.max(
        0,
        importedSessions.length - operations.length
    );

    await appendHealthDiagnosticEvent({
        id: createHealthDiagnosticId("cardio-merge"),
        createdAt: toIsoNow(),
        provider: inspection.provider,
        level: "info",
        kind: "cardio-merge",
        targetDate: input.date,
        existingSessionCount: existingSessions.length,
        mergedSessionCount: mergeResult.mergedSessions.length,
        insertedCount: plannedInsertedCount,
        updatedCount: plannedUpdatedCount,
        unchangedCount,
        operations: operations.map(toHealthCardioPersistenceOperation),
    });

    const executions = await persistCardioOperations({
        provider: inspection.provider,
        date: input.date,
        operations,
    });
    const insertedCount = executions.filter(
        (execution) => execution.operation === "create"
    ).length;
    const updatedCount = executions.filter(
        (execution) => execution.operation === "patch"
    ).length;

    let day: WorkoutDay | null;

    try {
        day = await safeGetWorkoutDay(input.date);
    } catch (error: unknown) {
        await appendCardioSyncError({
            provider: inspection.provider,
            date: input.date,
            stage: "refresh",
            error,
        });
        throw error;
    }

    const persistedSessions = getExistingCardioSessions(
        day,
        input.date,
        input.activityTypes,
        input.cardioEnvironments
    );

    await appendHealthDiagnosticEvent({
        id: createHealthDiagnosticId("cardio-sync-completed"),
        createdAt: toIsoNow(),
        provider: inspection.provider,
        level: "info",
        kind: "cardio-sync-completed",
        targetDate: input.date,
        importedCount: importedSessions.length,
        insertedCount,
        updatedCount,
        unchangedCount,
        persistedCount: persistedSessions.length,
        routeSessionCount: inspection.routeSessionCount,
        routePointCount: inspection.routePointCount,
    });

    return {
        provider: inspection.provider,
        date: input.date,
        importedCount: importedSessions.length,
        insertedCount,
        updatedCount,
        unchangedCount,
        importedSessions,
        mappedSessions,
        persistedSessions,
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
    const existingCardioSessions = getExistingCardioSessions(
        existingDay,
        input.date,
        input.activityTypes,
        input.cardioEnvironments
    );

    if (existingCardioSessions.length > 0) {
        return {
            provider: (await getCardioHealthProvider()) ?? resolveFallbackProvider(),
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
    const inspection = await inspectCardioSessionsForDate({
        date: input.date,
        includeRoutes: input.includeRoutes ?? true,
        activityTypes: input.activityTypes,
        cardioEnvironments: input.cardioEnvironments,
    });

    const matchedImportedSession = findImportedSessionMatch(
        inspection.importedSessions,
        inspection.existingSessions,
        input
    );

    if (!matchedImportedSession) {
        return {
            provider: inspection.provider,
            date: input.date,
            matchedImportedSession: null,
            mappedSession: null,
            day: inspection.existingDay,
            updated: false,
        };
    }

    const mappedSession = mapImportedCardioSessionToWorkoutSession(
        matchedImportedSession
    );
    const mergeResult = mergeCardioSessionsIntoExistingSessions(
        inspection.existingSessions,
        [matchedImportedSession]
    );
    const operations = buildPersistencePlan(
        inspection.existingSessions,
        mergeResult.mergedSessions
    );

    await appendHealthDiagnosticEvent({
        id: createHealthDiagnosticId("cardio-merge"),
        createdAt: toIsoNow(),
        provider: inspection.provider,
        level: "info",
        kind: "cardio-merge",
        targetDate: input.date,
        existingSessionCount: inspection.existingSessions.length,
        mergedSessionCount: mergeResult.mergedSessions.length,
        insertedCount: operations.filter((item) => item.operation === "create").length,
        updatedCount: operations.filter((item) => item.operation === "patch").length,
        unchangedCount: operations.length === 0 ? 1 : 0,
        operations: operations.map(toHealthCardioPersistenceOperation),
    });

    await persistCardioOperations({
        provider: inspection.provider,
        date: input.date,
        operations,
    });

    const day = await safeGetWorkoutDay(input.date);

    return {
        provider: inspection.provider,
        date: input.date,
        matchedImportedSession,
        mappedSession,
        day,
        updated: operations.length > 0,
    };
}
