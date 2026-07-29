// scripts/verify-cardio-sync-orchestration.cjs
// Simulates the Cardio orchestration without React Native or network access.
// Covers missing days, existing sessions, no-op dates, and stale session IDs.

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const servicePath = path.join(
    root,
    "src/services/health/cardio/cardioSync.service.ts"
);

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function createNotFoundError(message) {
    const error = new Error(message);
    error.status = 404;
    error.code = "NOT_FOUND";
    return error;
}

function normalizeApiError(error) {
    const responseStatus = error?.response?.status;
    return {
        status: typeof responseStatus === "number"
            ? responseStatus
            : typeof error?.status === "number"
                ? error.status
                : null,
        code: typeof error?.code === "string" ? error.code : null,
        message: error instanceof Error ? error.message : "Unknown error",
        details: null,
    };
}

function makeImportedSession(externalId = "health-session-1") {
    return {
        date: "2026-05-31",
        externalId,
        activityType: "walking",
        cardioEnvironment: "outdoor",
        source: "healthkit",
        sourceDevice: "Apple Watch",
        startAt: "2026-05-31T12:00:00.000Z",
        endAt: "2026-05-31T12:30:00.000Z",
        importedAt: "2026-07-29T06:00:00.000Z",
        lastSyncedAt: "2026-07-29T06:00:00.000Z",
        providerWorkoutType: "Walking",
        notes: null,
        metrics: {
            durationSeconds: 1800,
            activeKcal: 150,
            totalKcal: 220,
            avgHr: 110,
            maxHr: 145,
            distanceKm: 2.1,
            steps: 3000,
            elevationGainM: 8,
            paceSecPerKm: 857,
            cadenceRpm: null,
        },
        route: null,
        raw: null,
    };
}

function mapImportedSession(session) {
    return {
        id: session.externalId,
        type: "Outdoor Walking",
        activityType: session.activityType,
        cardioEnvironment: session.cardioEnvironment,
        startAt: session.startAt,
        endAt: session.endAt,
        durationSeconds: session.metrics.durationSeconds,
        activeKcal: session.metrics.activeKcal,
        totalKcal: session.metrics.totalKcal,
        avgHr: session.metrics.avgHr,
        maxHr: session.metrics.maxHr,
        distanceKm: session.metrics.distanceKm,
        steps: session.metrics.steps,
        elevationGainM: session.metrics.elevationGainM,
        paceSecPerKm: session.metrics.paceSecPerKm,
        cadenceRpm: session.metrics.cadenceRpm,
        hasRoute: false,
        routeSummary: null,
        routePoints: null,
        cardioMetrics: null,
        effortRpe: null,
        notes: null,
        media: null,
        exercises: null,
        meta: {
            source: "healthkit",
            sessionKind: "device-import",
            externalId: session.externalId,
            healthExternalId: session.externalId,
        },
    };
}

function compileService(state) {
    const source = fs.readFileSync(servicePath, "utf8");
    const output = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
            strict: true,
            esModuleInterop: true,
        },
        fileName: servicePath,
    }).outputText;

    const moduleValue = { exports: {} };

    function customRequire(id) {
        const modules = {
            "react-native": { Platform: { OS: "ios" } },
            "@/src/services/health/cardio/cardioHealth.service": {
                getCardioHealthProvider: async () => "healthkit",
                readCardioSessions: async () => ({
                    provider: "healthkit",
                    sessions: state.importedSessions,
                }),
            },
            "@/src/services/health/diagnostics/healthDiagnostics.service": {
                appendHealthDiagnosticEvent: async (event) => {
                    state.diagnostics.push(event);
                },
                createHealthDiagnosticId: (prefix) => `${prefix}-${state.diagnostics.length + 1}`,
                toHealthDiagnosticJson: (value) => value,
            },
            "@/src/services/workout/days.service": {
                getWorkoutDayServ: async () => {
                    state.getDayCalls += 1;
                    if (!state.dayExists) {
                        throw createNotFoundError("Workout day not found");
                    }
                    return state.day;
                },
            },
            "@/src/services/workout/sessions.service": {
                ensureWorkoutDayExists: async () => {
                    state.ensureCalls += 1;
                    if (!state.dayExists) {
                        state.dayExists = true;
                        state.day = {
                            id: "day-1",
                            date: "2026-05-31",
                            weekKey: "2026-W22",
                            sleep: null,
                            training: null,
                            plannedRoutine: null,
                            plannedMeta: null,
                            dayNotes: [],
                            notes: null,
                            tags: null,
                            meta: null,
                        };
                    }
                },
                createSession: async (_date, payload) => {
                    state.createCalls.push(payload);
                    const session = {
                        ...mapImportedSession(state.importedSessions[0]),
                        id: `backend-created-${state.createCalls.length}`,
                    };
                    state.day.training = {
                        sessions: [...(state.day.training?.sessions ?? []), session],
                        source: null,
                        dayEffortRpe: null,
                        raw: null,
                    };
                    return { session };
                },
                patchSession: async (_date, sessionId, payload) => {
                    state.patchCalls.push(sessionId);

                    if (state.staleId === sessionId) {
                        const sessions = state.day.training?.sessions ?? [];
                        state.day.training.sessions = sessions.map((session) =>
                            session.id === sessionId
                                ? { ...session, id: state.refreshedId }
                                : session
                        );
                        state.staleId = null;
                        throw createNotFoundError("Training session not found");
                    }

                    const sessions = state.day.training?.sessions ?? [];
                    const index = sessions.findIndex((session) => session.id === sessionId);
                    if (index < 0) {
                        throw createNotFoundError("Training session not found");
                    }

                    sessions[index] = { ...sessions[index], ...payload, id: sessionId };
                    return { session: sessions[index] };
                },
            },
            "@/src/utils/api/apiErrorMessage": { normalizeApiError },
            "@/src/utils/health/cardio/cardioDiagnostics.mapper": {
                toHealthCardioDiagnosticSession: (session) => session,
                toHealthCardioPersistenceOperation: (operation) => operation,
            },
            "@/src/utils/health/cardio/cardioSession.dedupe": {
                mergeCardioSessionsIntoExistingSessions: (existingSessions, importedSessions) => {
                    const incoming = mapImportedSession(importedSessions[0]);
                    const existing = existingSessions[0] ?? null;

                    if (!existing) {
                        return {
                            mergedSessions: [incoming],
                            insertedCount: 1,
                            updatedCount: 0,
                            unchangedCount: 0,
                        };
                    }

                    return {
                        mergedSessions: [{ ...incoming, id: existing.id }],
                        insertedCount: 0,
                        updatedCount: 1,
                        unchangedCount: 0,
                    };
                },
            },
            "@/src/utils/health/cardio/cardioSession.grouping": {
                getCardioSessionsForDate: (sessions) => sessions.filter(
                    (session) => session.activityType === "walking" || session.activityType === "running"
                ),
            },
            "@/src/utils/health/cardio/cardioSession.helpers": {
                isCardioActivityType: (value) => value === "walking" || value === "running",
            },
            "@/src/utils/health/cardio/cardioSession.mapper": {
                mapImportedCardioSessionToWorkoutSession: mapImportedSession,
            },
            "@/src/utils/health/cardio/cardioSessionPayload.mapper": {
                areCardioSessionPayloadsEqual: () => false,
                toCardioCreateSessionBody: (session) => ({ type: session.type, meta: session.meta }),
                toCardioPatchSessionBody: (session) => ({ type: session.type, meta: session.meta }),
            },
        };

        if (!(id in modules)) {
            throw new Error(`Unexpected module in orchestration test: ${id}`);
        }

        return modules[id];
    }

    const context = vm.createContext({
        module: moduleValue,
        exports: moduleValue.exports,
        require: customRequire,
        console,
        Date,
        Error,
        Map,
        Set,
        Array,
        Object,
        Math,
        JSON,
        Number,
        String,
        Boolean,
        Promise,
    });

    new vm.Script(output, { filename: servicePath }).runInContext(context);
    return moduleValue.exports;
}

function createState({ dayExists, sessions, importedSessions, staleId = null, refreshedId = null }) {
    return {
        dayExists,
        importedSessions,
        staleId,
        refreshedId,
        diagnostics: [],
        ensureCalls: 0,
        getDayCalls: 0,
        createCalls: [],
        patchCalls: [],
        day: dayExists
            ? {
                id: "day-1",
                date: "2026-05-31",
                weekKey: "2026-W22",
                sleep: null,
                training: {
                    sessions,
                    source: null,
                    dayEffortRpe: null,
                    raw: null,
                },
                plannedRoutine: null,
                plannedMeta: null,
                dayNotes: [],
                notes: null,
                tags: null,
                meta: null,
            }
            : null,
    };
}

async function run() {
    const imported = makeImportedSession();

    const missingDayState = createState({
        dayExists: false,
        sessions: [],
        importedSessions: [imported],
    });
    const missingDayService = compileService(missingDayState);
    const missingDayResult = await missingDayService.syncCardioSessionsForDate({
        date: "2026-05-31",
    });
    assert(missingDayState.ensureCalls === 1, "Missing day must be upserted exactly once.");
    assert(missingDayState.createCalls.length === 1, "Imported session must be created.");
    assert(missingDayState.patchCalls.length === 0, "Missing-day flow must not PATCH.");
    assert(missingDayResult.insertedCount === 1, "Missing-day result must report one insert.");

    const existingSession = {
        ...mapImportedSession(imported),
        id: "existing-session-id",
        meta: {
            source: "app-live",
            sessionKind: "live-cardio",
            externalId: "app-live|walking|2026-05-31T12:00:00.000Z",
            healthExternalId: imported.externalId,
        },
    };
    const existingDayState = createState({
        dayExists: true,
        sessions: [existingSession],
        importedSessions: [imported],
    });
    const existingDayService = compileService(existingDayState);
    const existingDayResult = await existingDayService.syncCardioSessionsForDate({
        date: "2026-05-31",
    });
    assert(existingDayState.ensureCalls === 0, "Existing day must never be rewritten before PATCH.");
    assert(existingDayState.patchCalls.join(",") === "existing-session-id", "Existing session must PATCH its current ID.");
    assert(existingDayState.createCalls.length === 0, "Existing app-live session must not duplicate.");
    assert(existingDayResult.updatedCount === 1, "Existing session result must report one update.");

    const staleState = createState({
        dayExists: true,
        sessions: [existingSession],
        importedSessions: [imported],
        staleId: "existing-session-id",
        refreshedId: "refreshed-session-id",
    });
    const staleService = compileService(staleState);
    const staleResult = await staleService.syncCardioSessionsForDate({
        date: "2026-05-31",
    });
    assert(
        staleState.patchCalls.join(",") === "existing-session-id,refreshed-session-id",
        "Stale PATCH must refresh the day and retry with the stable matching session ID."
    );
    assert(staleState.createCalls.length === 0, "Recovered stale ID must not create a duplicate.");
    assert(staleResult.updatedCount === 1, "Recovered stale ID must still report one update.");

    const emptyState = createState({
        dayExists: false,
        sessions: [],
        importedSessions: [],
    });
    const emptyService = compileService(emptyState);
    const emptyResult = await emptyService.syncCardioSessionsForDate({
        date: "2026-05-31",
    });
    assert(emptyState.ensureCalls === 0, "No Health sessions must not create an empty WorkoutDay.");
    assert(emptyState.createCalls.length === 0, "No Health sessions must not create a session.");
    assert(emptyResult.day === null, "No-data result must preserve a missing day as null.");

    console.log("✓ Cardio orchestration: missing day, existing app-live, stale ID recovery, and empty day verified.");
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
