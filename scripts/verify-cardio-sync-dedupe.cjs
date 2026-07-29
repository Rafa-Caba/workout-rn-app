// /scripts/verify-cardio-dedupe.cjs
// Executes the real Cardio dedupe module and verifies imported sessions do not
// duplicate matching Health, app-live, or manual-cardio sessions.

const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const moduleCache = new Map();

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function resolveTypeScriptPath(request, parentFile) {
    const candidate = request.startsWith("@/")
        ? path.join(root, request.slice(2))
        : path.resolve(path.dirname(parentFile), request);

    const candidates = [
        candidate,
        `${candidate}.ts`,
        `${candidate}.tsx`,
        path.join(candidate, "index.ts"),
        path.join(candidate, "index.tsx"),
    ];

    return candidates.find((filePath) => fs.existsSync(filePath)) ?? null;
}

function loadTypeScriptModule(filePath) {
    const absolutePath = path.resolve(filePath);
    const cached = moduleCache.get(absolutePath);
    if (cached) return cached.exports;

    const moduleValue = { exports: {} };
    moduleCache.set(absolutePath, moduleValue);

    const source = fs.readFileSync(absolutePath, "utf8");
    const output = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
            strict: true,
            esModuleInterop: true,
        },
        fileName: absolutePath,
    }).outputText;

    function localRequire(request) {
        if (request.startsWith("@/") || request.startsWith(".")) {
            const resolved = resolveTypeScriptPath(request, absolutePath);
            if (!resolved) {
                throw new Error(`Could not resolve ${request} from ${absolutePath}`);
            }
            return loadTypeScriptModule(resolved);
        }

        return require(request);
    }

    const execute = new Function(
        "require",
        "module",
        "exports",
        "__filename",
        "__dirname",
        output
    );
    execute(
        localRequire,
        moduleValue,
        moduleValue.exports,
        absolutePath,
        path.dirname(absolutePath)
    );

    return moduleValue.exports;
}

function makeImportedSession() {
    return {
        date: "2026-05-31",
        externalId: "healthkit-workout-1",
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
            avgSpeedKmh: 4.2,
            maxSpeedKmh: null,
            strideLengthM: null,
        },
        route: null,
        raw: null,
    };
}

const dedupePath = path.join(
    root,
    "src/utils/health/cardio/cardioSession.dedupe.ts"
);
const mapperPath = path.join(
    root,
    "src/utils/health/cardio/cardioSession.mapper.ts"
);

const dedupe = loadTypeScriptModule(dedupePath);
const mapper = loadTypeScriptModule(mapperPath);
const imported = makeImportedSession();
const mapped = mapper.mapImportedCardioSessionToWorkoutSession(imported);

const existingImported = {
    ...mapped,
    id: "backend-imported-id",
};
const importedResult = dedupe.mergeCardioSessionsIntoExistingSessions(
    [existingImported],
    [imported]
);
assert(importedResult.mergedSessions.length === 1, "Existing Health import must not duplicate.");
assert(importedResult.mergedSessions[0].id === "backend-imported-id", "Health import must preserve the backend session ID.");

const existingAppLive = {
    ...mapped,
    id: "backend-app-live-id",
    meta: {
        ...mapped.meta,
        source: "app-live",
        sessionKind: "live-cardio",
        externalId: "app-live|walking|2026-05-31T12:00:00.000Z",
        healthExternalId: imported.externalId,
        healthWriteStatus: "pending",
    },
};
const appLiveResult = dedupe.mergeCardioSessionsIntoExistingSessions(
    [existingAppLive],
    [imported]
);
assert(appLiveResult.mergedSessions.length === 1, "Matching app-live session must not duplicate.");
assert(appLiveResult.mergedSessions[0].id === "backend-app-live-id", "App-live merge must preserve the backend session ID.");
assert(appLiveResult.mergedSessions[0].meta?.source === "app-live", "App-live identity must remain app-live after Health backfill.");
assert(appLiveResult.mergedSessions[0].meta?.healthExternalId === imported.externalId, "App-live session must retain the Health external ID.");

const existingManual = {
    ...mapped,
    id: "backend-manual-id",
    notes: "Nota capturada manualmente",
    meta: {
        ...mapped.meta,
        source: "manual",
        sessionKind: "manual-cardio",
        externalId: "manual-cardio-1",
        healthExternalId: null,
    },
};
const manualResult = dedupe.mergeCardioSessionsIntoExistingSessions(
    [existingManual],
    [imported]
);
assert(manualResult.mergedSessions.length === 1, "Matching manual-cardio fallback must not duplicate.");
assert(manualResult.mergedSessions[0].id === "backend-manual-id", "Manual fallback merge must preserve the backend session ID.");
assert(manualResult.mergedSessions[0].notes === "Nota capturada manualmente", "Manual notes must survive Health replacement.");

const separateManual = {
    ...existingManual,
    id: "separate-manual-id",
    startAt: "2026-05-31T18:00:00.000Z",
    endAt: "2026-05-31T18:30:00.000Z",
};
const separateResult = dedupe.mergeCardioSessionsIntoExistingSessions(
    [separateManual],
    [imported]
);
assert(separateResult.mergedSessions.length === 2, "A different manual session must remain separate.");

const gymSession = {
    ...mapped,
    id: "gym-session-id",
    type: "Gym Check",
    activityType: "strength",
    cardioEnvironment: null,
    meta: {
        ...mapped.meta,
        source: "manual",
        sessionKind: "gym-check",
        externalId: "gym-check-1",
        healthExternalId: null,
    },
};
const gymResult = dedupe.mergeCardioSessionsIntoExistingSessions(
    [gymSession],
    [imported]
);
assert(gymResult.mergedSessions.length === 2, "Gym sessions must never be consumed by Cardio dedupe.");

console.log(
    "✓ Cardio dedupe: Health import, app-live, manual-cardio, distinct manual, and Gym Check coexistence verified."
);
