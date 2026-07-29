// scripts/verify-cardio-sync-contract.cjs
// Verifies the strict cardio CRUD payload and guards against returning to full-day writes.

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const mapperPath = path.join(
    root,
    "src/utils/health/cardio/cardioSessionPayload.mapper.ts"
);
const syncServicePath = path.join(
    root,
    "src/services/health/cardio/cardioSync.service.ts"
);
const sessionsServicePath = path.join(
    root,
    "src/services/workout/sessions.service.ts"
);
const apiErrorPath = path.join(
    root,
    "src/utils/api/apiErrorMessage.ts"
);
const datePickerPath = path.join(
    root,
    "src/features/components/DatePickerField.tsx"
);

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function loadMapper() {
    const source = fs.readFileSync(mapperPath, "utf8");
    const compiled = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
            strict: true,
        },
        fileName: mapperPath,
    }).outputText;

    const moduleValue = { exports: {} };
    const context = vm.createContext({
        module: moduleValue,
        exports: moduleValue.exports,
        require,
        console,
    });

    new vm.Script(compiled, { filename: mapperPath }).runInContext(context);
    return moduleValue.exports;
}

function loadTypeScriptModule(filePath) {
    const source = fs.readFileSync(filePath, "utf8");
    const compiled = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
            strict: true,
        },
        fileName: filePath,
    }).outputText;

    const moduleValue = { exports: {} };
    const context = vm.createContext({
        module: moduleValue,
        exports: moduleValue.exports,
        require,
        console,
    });

    new vm.Script(compiled, { filename: filePath }).runInContext(context);
    return moduleValue.exports;
}

const mapper = loadMapper();
const routePoints = [
    {
        latitude: 20.7001,
        longitude: -103.3501,
        altitudeM: 1624,
        accuracyM: 4,
        speedMps: 1.5,
        headingDeg: 30,
        recordedAt: "2026-05-31T23:00:00.000Z",
    },
    {
        latitude: 20.7002,
        longitude: -103.3502,
        altitudeM: 1625,
        accuracyM: 5,
        speedMps: 1.6,
        headingDeg: 35,
        recordedAt: "2026-05-31T23:00:10.000Z",
    },
];

const session = {
    id: "native-workout-id",
    type: "Outdoor Walking",
    activityType: "walking",
    cardioEnvironment: "outdoor",
    startAt: "2026-05-31T23:00:00.000Z",
    endAt: "2026-05-31T23:45:15.000Z",
    durationSeconds: 2715,
    activeKcal: 162.4,
    totalKcal: 250.4,
    avgHr: 114,
    maxHr: 160,
    distanceKm: 2.2,
    steps: null,
    elevationGainM: 8,
    paceSecPerKm: 1232,
    cadenceRpm: null,
    hasRoute: true,
    routeSummary: null,
    routePoints,
    cardioMetrics: {
        distanceKm: 2.2,
        steps: null,
        elevationGainM: 8,
        paceSecPerKm: 1232,
        avgSpeedKmh: 2.92,
        maxSpeedKmh: null,
        cadenceRpm: null,
        strideLengthM: null,
    },
    effortRpe: 5,
    notes: "Walk",
    media: [{ publicId: "must-not-be-sent" }],
    exercises: [{ id: "must-not-be-sent" }],
    meta: {
        source: "healthkit",
        sourceDevice: "Apple Watch",
        importedAt: "2026-07-28T18:00:00.000Z",
        lastSyncedAt: "2026-07-28T18:00:00.000Z",
        sessionKind: "device-import",
        externalId: "native-workout-id",
        provider: "healthkit",
        totalKcalEstimated: false,
        unexpectedLegacyField: "must-not-be-sent",
    },
};

const createPayload = mapper.toCardioCreateSessionBody(session);
const patchPayload = mapper.toCardioPatchSessionBody(session);

assert(createPayload.type === "Outdoor Walking", "Create must include type.");
assert(createPayload.activeKcal === 162, "Calories must be rounded for API contract.");
assert(createPayload.totalKcal === 250, "Total calories must be rounded.");
assert(createPayload.exercises === null, "Cardio create must not rewrite exercises.");
assert(!Object.hasOwn(createPayload, "media"), "Cardio payload must not include media.");
assert(
    !Object.hasOwn(createPayload.meta, "unexpectedLegacyField"),
    "Unknown strict meta fields must be stripped."
);
assert(createPayload.routePoints.length === 2, "All valid route points must be preserved.");
assert(createPayload.routeSummary.pointCount === 2, "Route summary must match points.");
assert(patchPayload.hasRoute === true, "Patch must preserve route state.");
assert(
    mapper.areCardioSessionPayloadsEqual(session, { ...session }) === true,
    "Equal canonical sessions must avoid a no-op PATCH."
);

const syncSource = fs.readFileSync(syncServicePath, "utf8");
assert(
    !syncSource.includes("upsertWorkoutDay"),
    "Cardio sync must not write the complete WorkoutDay."
);
assert(syncSource.includes("createSession("), "Cardio sync must use createSession CRUD.");
assert(syncSource.includes("patchSession("), "Cardio sync must use patchSession CRUD.");
assert(
    syncSource.includes("cardio-persistence"),
    "Cardio sync must record persistence diagnostics."
);
assert(
    syncSource.includes("workingDay = await ensureCardioWorkoutDay(input.date)"),
    "A missing WorkoutDay must be created before the merge plan is built."
);
assert(
    syncSource.includes("findSessionByStableIdentity"),
    "PATCH recovery must resolve a refreshed session by stable identity."
);

const persistenceStart = syncSource.indexOf("async function persistCardioOperations");
const persistenceEnd = syncSource.indexOf("function findImportedSessionMatch", persistenceStart);
const persistenceSource = syncSource.slice(persistenceStart, persistenceEnd);
assert(
    !persistenceSource.includes("await ensureWorkoutDayExists(input.date)"),
    "Persistence must not rewrite an existing WorkoutDay after capturing session IDs."
);

const sessionsSource = fs.readFileSync(sessionsServicePath, "utf8");
const ensureStart = sessionsSource.indexOf("export async function ensureWorkoutDayExists");
const ensureEnd = sessionsSource.indexOf("export async function getWorkoutDay", ensureStart);
const ensureSource = sessionsSource.slice(ensureStart, ensureEnd);
assert(
    ensureSource.indexOf("api.get<unknown>") < ensureSource.indexOf("api.put("),
    "ensureWorkoutDayExists must read first and only upsert a missing day."
);

const apiError = loadTypeScriptModule(apiErrorPath);
const normalizedLocalNotFound = apiError.normalizeApiError({
    status: 404,
    code: "NOT_FOUND",
    message: "Workout day not found",
    details: { date: "2026-05-31" },
});
assert(
    normalizedLocalNotFound.status === 404 && normalizedLocalNotFound.code === "NOT_FOUND",
    "Local WorkoutDayNotFoundError metadata must survive normalization."
);

const datePickerSource = fs.readFileSync(datePickerPath, "utf8");
assert(
    datePickerSource.includes("themeVariant={resolvedScheme}"),
    "The iOS date picker must follow the resolved app theme."
);
assert(
    datePickerSource.includes("setTemp(parseISODateOrToday(value))"),
    "The date picker must reset its temporary value when reopened or cancelled."
);

console.log(
    "✓ Cardio sync contract: missing-day upsert, stable session recovery, strict payload, and themed date picker verified."
);
