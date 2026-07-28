// /scripts/verify-health-gym-check.cjs
// Verifies the Gym Check HealthKit filter and the native workout query contract.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const SELECTOR_PATH = path.join(
    PROJECT_ROOT,
    "src/utils/health/healthGymCheckWorkout.selector.ts"
);
const IOS_BRIDGE_PATH = path.join(
    PROJECT_ROOT,
    "src/services/health/bridge/healthIOS.bridge.ts"
);

function hasMeaningfulImportedWorkoutMetrics(metrics) {
    return Object.values(metrics).some(
        (value) => typeof value === "number" && Number.isFinite(value) && value > 0
    );
}

function loadSelector() {
    const source = fs.readFileSync(SELECTOR_PATH, "utf8");
    const transpiled = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
            esModuleInterop: true,
            strict: true,
        },
        fileName: SELECTOR_PATH,
        reportDiagnostics: true,
    });

    const errors = (transpiled.diagnostics ?? []).filter(
        (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
    );
    assert.equal(errors.length, 0, "The Gym Check selector must transpile cleanly.");

    const moduleValue = { exports: {} };
    const localRequire = (request) => {
        if (request === "@/src/utils/health/healthWorkout.mapper") {
            return { hasMeaningfulImportedWorkoutMetrics };
        }

        throw new Error(`Unexpected selector dependency: ${request}`);
    };

    const execute = new Function("require", "module", "exports", transpiled.outputText);
    execute(localRequire, moduleValue, moduleValue.exports);
    return moduleValue.exports;
}

function workout({
    type,
    durationSeconds,
    activeKcal = null,
    avgHr = null,
    maxHr = null,
    startAt = "2026-07-27T06:20:00.000-0600",
}) {
    return {
        externalId: `${type}-${durationSeconds}`,
        type,
        providerWorkoutType: type,
        cardioEnvironment: null,
        startAt,
        endAt: "2026-07-27T07:30:31.000-0600",
        metrics: {
            durationSeconds,
            activeKcal,
            totalKcal: null,
            avgHr,
            maxHr,
            distanceKm: null,
            steps: null,
            elevationGainM: null,
            paceSecPerKm: null,
            cadenceRpm: null,
            effortRpe: null,
        },
        route: null,
        notes: null,
        source: "healthkit",
        sourceDevice: "Rafael's Apple Watch",
        importedAt: "2026-07-28T00:00:00.000Z",
        lastSyncedAt: "2026-07-28T00:00:00.000Z",
        sessionKind: "device-import",
        raw: null,
    };
}

const {
    GYM_CHECK_PROVIDER_WORKOUT_TYPE,
    getGymCheckHealthWorkoutCandidates,
    isGymCheckHealthWorkout,
    selectGymCheckHealthWorkout,
} = loadSelector();

assert.equal(GYM_CHECK_PROVIDER_WORKOUT_TYPE, "TraditionalStrengthTraining");

const running = workout({
    type: "Running",
    durationSeconds: 5400,
    activeKcal: 700,
});
const functionalStrength = workout({
    type: "FunctionalStrengthTraining",
    durationSeconds: 4800,
    activeKcal: 500,
});
const shorterTraditionalStrength = workout({
    type: "TraditionalStrengthTraining",
    durationSeconds: 1800,
    activeKcal: 190,
});
const expectedTraditionalStrength = workout({
    type: "Traditional Strength Training",
    durationSeconds: 4231,
    activeKcal: 425,
    avgHr: 111,
    maxHr: 154,
});
const emptyTraditionalStrength = workout({
    type: "TraditionalStrengthTraining",
    durationSeconds: 0,
});

assert.equal(isGymCheckHealthWorkout(running), false);
assert.equal(isGymCheckHealthWorkout(functionalStrength), false);
assert.equal(isGymCheckHealthWorkout(expectedTraditionalStrength), true);

const candidates = getGymCheckHealthWorkoutCandidates([
    running,
    functionalStrength,
    shorterTraditionalStrength,
    expectedTraditionalStrength,
]);
assert.deepEqual(
    candidates.map((candidate) => candidate.providerWorkoutType),
    ["Traditional Strength Training", "TraditionalStrengthTraining"]
);

const selected = selectGymCheckHealthWorkout([
    running,
    emptyTraditionalStrength,
    shorterTraditionalStrength,
    expectedTraditionalStrength,
]);
assert.equal(selected?.metrics.durationSeconds, 4231);
assert.equal(selected?.metrics.activeKcal, 425);
assert.equal(selected?.metrics.avgHr, 111);
assert.equal(selected?.metrics.maxHr, 154);

assert.equal(selectGymCheckHealthWorkout([running, functionalStrength]), null);
assert.equal(selectGymCheckHealthWorkout([emptyTraditionalStrength]), null);

const iosBridge = fs.readFileSync(IOS_BRIDGE_PATH, "utf8");
assert.match(
    iosBridge,
    /type:\s*"Workout"/,
    "The iOS bridge must query actual HKWorkout records."
);
assert.match(
    iosBridge,
    /BasalEnergyBurned/,
    "The iOS bridge must request basal energy for total calories."
);

console.log("✓ Gym Check selector: exact Traditional Strength Training filter verified.");
console.log("✓ Gym Check selector: strongest eligible workout selection verified.");
console.log("✓ HealthKit bridge: real Workout query and basal energy verified.");
