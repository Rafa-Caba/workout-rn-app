// /scripts/verify-health-gym-check.cjs
// Verifies Gym Check HealthKit filtering, calorie normalization, and clean UI.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const SELECTOR_PATH = path.join(
    PROJECT_ROOT,
    "src/utils/health/healthGymCheckWorkout.selector.ts"
);
const MAPPER_PATH = path.join(
    PROJECT_ROOT,
    "src/utils/health/healthWorkout.mapper.ts"
);
const IOS_BRIDGE_PATH = path.join(
    PROJECT_ROOT,
    "src/services/health/bridge/healthIOS.bridge.ts"
);
const METRICS_CARD_PATH = path.join(
    PROJECT_ROOT,
    "src/features/gymCheck/components/GymCheckDeviceMetricsCard.tsx"
);

function transpileCommonJs(filePath) {
    const source = fs.readFileSync(filePath, "utf8");
    const transpiled = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
            esModuleInterop: true,
            strict: true,
            jsx: ts.JsxEmit.ReactJSX,
        },
        fileName: filePath,
        reportDiagnostics: true,
    });

    const errors = (transpiled.diagnostics ?? []).filter(
        (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
    );
    assert.equal(errors.length, 0, `${filePath} must transpile cleanly.`);
    return transpiled.outputText;
}

function executeModule(filePath, localRequire) {
    const moduleValue = { exports: {} };
    const execute = new Function(
        "require",
        "module",
        "exports",
        transpileCommonJs(filePath)
    );
    execute(localRequire, moduleValue, moduleValue.exports);
    return moduleValue.exports;
}

const mapper = executeModule(MAPPER_PATH, (request) => {
    if (request === "@/src/utils/health/healthDate.utils") {
        return {
            resolveWorkoutDateFromDateTime: () => "2026-07-27",
        };
    }

    throw new Error(`Unexpected mapper dependency: ${request}`);
});

const selector = executeModule(SELECTOR_PATH, (request) => {
    if (request === "@/src/utils/health/healthWorkout.mapper") {
        return {
            hasMeaningfulImportedWorkoutMetrics:
                mapper.hasMeaningfulImportedWorkoutMetrics,
        };
    }

    throw new Error(`Unexpected selector dependency: ${request}`);
});

function workout({
    type,
    durationSeconds,
    activeKcal = null,
    totalKcal = null,
    totalKcalEstimated = false,
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
            totalKcal,
            totalKcalEstimated,
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
} = selector;

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
    durationSeconds: 4232,
    activeKcal: 425.3620000000013,
    totalKcal: 586.6065880617784,
    totalKcalEstimated: true,
    avgHr: 112,
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
assert.equal(selected?.metrics.durationSeconds, 4232);
assert.equal(selected?.metrics.avgHr, 112);
assert.equal(selected?.metrics.maxHr, 154);

const patch = mapper.mapImportedWorkoutToGymCheckMetricsPatch(
    expectedTraditionalStrength
);
assert.equal(patch.activeKcal, 425);
assert.equal(patch.totalKcal, 587);
assert.equal(patch.meta?.totalKcalEstimated, true);
assert.equal("distanceKm" in patch, false);
assert.equal("steps" in patch, false);
assert.equal("elevationGainM" in patch, false);
assert.equal("paceSecPerKm" in patch, false);
assert.equal("cadenceRpm" in patch, false);

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
    "The iOS bridge must request basal energy for estimated total calories."
);
assert.match(
    iosBridge,
    /totalKcalEstimated:\s*totalKcal\s*!==\s*null/,
    "The iOS bridge must mark reconstructed total calories as estimated."
);

const metricsCard = fs.readFileSync(METRICS_CARD_PATH, "utf8");
for (const removedLabel of [
    "Distancia (km)",
    "Pasos",
    "Elevación (m)",
    "Ritmo (sec/km)",
    "Cadencia (rpm)",
]) {
    assert.equal(
        metricsCard.includes(removedLabel),
        false,
        `Gym Check must not render ${removedLabel}.`
    );
}
assert.match(metricsCard, /Kcal totales \(estimadas\)/);

console.log("✓ Gym Check: exact Traditional Strength Training filter verified.");
console.log("✓ Gym Check: calories round to 425 active and 587 estimated total.");
console.log("✓ Gym Check: cardio-only inputs are absent from the shared metrics card.");
console.log("✓ HealthKit: basal-energy total is explicitly marked as estimated.");
