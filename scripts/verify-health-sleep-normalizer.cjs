// /scripts/verify-health-sleep-normalizer.cjs

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const NORMALIZER_PATH = path.join(
    PROJECT_ROOT,
    "src/utils/health/healthSleep.normalizer.ts"
);
const HEALTH_INDEX_PATH = path.join(
    PROJECT_ROOT,
    "node_modules/react-native-health/index.js"
);
const HEALTH_QUERIES_PATH = path.join(
    PROJECT_ROOT,
    "node_modules/react-native-health/RCTAppleHealthKit/RCTAppleHealthKit+Queries.m"
);

function loadNormalizer() {
    const source = fs.readFileSync(NORMALIZER_PATH, "utf8");
    const transpiled = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
            esModuleInterop: true,
            strict: true,
        },
        fileName: NORMALIZER_PATH,
        reportDiagnostics: true,
    });

    const errors = (transpiled.diagnostics ?? []).filter(
        (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
    );
    assert.equal(errors.length, 0, "El normalizador debe transpilar sin errores sintácticos.");

    const moduleValue = { exports: {} };
    const localRequire = (request) => {
        if (
            request ===
            "@/src/services/health/diagnostics/healthDiagnostics.service"
        ) {
            return {
                toHealthDiagnosticJson: (value) => {
                    try {
                        return JSON.parse(JSON.stringify(value));
                    } catch {
                        return null;
                    }
                },
            };
        }

        throw new Error(`Dependencia no esperada en normalizador: ${request}`);
    };

    const execute = new Function("require", "module", "exports", transpiled.outputText);
    execute(localRequire, moduleValue, moduleValue.exports);
    return moduleValue.exports;
}

function localISO(year, monthIndex, day, hour, minute) {
    return new Date(year, monthIndex, day, hour, minute, 0, 0).toISOString();
}

function sample({
    id,
    start,
    end,
    value,
    sourceId = "com.apple.health",
    sourceName = "Health",
}) {
    return {
        id,
        startDate: start,
        endDate: end,
        value,
        sourceId,
        sourceName,
    };
}

const { buildHealthKitSleepQueryRange, normalizeHealthKitSleepSamples } =
    loadNormalizer();

const targetDate = "2026-07-27";
const range = buildHealthKitSleepQueryRange(targetDate);
assert.equal(
    range.startDate,
    localISO(2026, 6, 26, 20, 0),
    "La ventana debe iniciar a las 20:00 del día anterior."
);
assert.equal(
    range.endDate,
    localISO(2026, 6, 27, 20, 0),
    "La ventana debe terminar a las 20:00 del día objetivo."
);

const watch = {
    sourceId: "com.apple.health.watch",
    sourceName: "Rafael's Apple Watch",
};
const health = {
    sourceId: "com.apple.health",
    sourceName: "Health",
};

const detailedSamples = [
    sample({
        id: "deep-1",
        start: localISO(2026, 6, 27, 0, 0),
        end: localISO(2026, 6, 27, 0, 51),
        value: "ASLEEP_DEEP",
        ...watch,
    }),
    sample({
        id: "deep-1",
        start: localISO(2026, 6, 27, 0, 0),
        end: localISO(2026, 6, 27, 0, 51),
        value: "ASLEEP_DEEP",
        ...watch,
    }),
    sample({
        id: "core-1",
        start: localISO(2026, 6, 27, 0, 51),
        end: localISO(2026, 6, 27, 2, 21),
        value: "ASLEEP_CORE",
        ...watch,
    }),
    sample({
        id: "rem-1",
        start: localISO(2026, 6, 27, 2, 21),
        end: localISO(2026, 6, 27, 3, 0),
        value: "ASLEEP_REM",
        ...watch,
    }),
    sample({
        id: "core-2",
        start: localISO(2026, 6, 27, 3, 0),
        end: localISO(2026, 6, 27, 4, 40),
        value: "ASLEEP_CORE",
        ...watch,
    }),
    sample({
        id: "rem-2",
        start: localISO(2026, 6, 27, 4, 40),
        end: localISO(2026, 6, 27, 5, 50),
        value: "ASLEEP_REM",
        ...watch,
    }),
    sample({
        id: "awake-1",
        start: localISO(2026, 6, 27, 5, 50),
        end: localISO(2026, 6, 27, 6, 4),
        value: "AWAKE",
        ...watch,
    }),
    sample({
        id: "generic-asleep",
        start: localISO(2026, 6, 27, 0, 0),
        end: localISO(2026, 6, 27, 5, 50),
        value: "ASLEEP",
        ...health,
    }),
    sample({
        id: "in-bed-main",
        start: localISO(2026, 6, 26, 23, 50),
        end: localISO(2026, 6, 27, 6, 4),
        value: "INBED",
        ...health,
    }),
    sample({
        id: "unrelated-long-in-bed",
        start: localISO(2026, 6, 27, 8, 0),
        end: localISO(2026, 6, 27, 16, 0),
        value: "INBED",
        sourceId: "third.party.sleep",
        sourceName: "Third Party",
    }),
];

const detailed = normalizeHealthKitSleepSamples(targetDate, detailedSamples);
assert.equal(detailed.diagnostics.outcome, "normalized");
assert.equal(detailed.diagnostics.duplicateSampleCount, 1);
assert.equal(detailed.sleep?.timeAsleepMinutes, 350);
assert.equal(detailed.sleep?.timeInBedMinutes, 374);
assert.equal(detailed.sleep?.remMinutes, 109);
assert.equal(detailed.sleep?.coreMinutes, 190);
assert.equal(detailed.sleep?.deepMinutes, 51);
assert.equal(detailed.sleep?.awakeMinutes, 14);
assert.equal(detailed.sleep?.sourceDevice, "Rafael's Apple Watch");
assert.equal(detailed.sleep?.raw, null, "Nunca se debe persistir raw de HealthKit.");
assert.equal(
    detailed.diagnostics.sourceSummaries.find((item) => item.selectedForInBed)?.sourceId,
    "com.apple.health",
    "INBED debe venir de la fuente que se superpone con el sueño, no de la más larga."
);

const generic = normalizeHealthKitSleepSamples(targetDate, [
    sample({
        id: "generic-1",
        start: localISO(2026, 6, 26, 23, 55),
        end: localISO(2026, 6, 27, 4, 0),
        value: "ASLEEP",
    }),
    sample({
        id: "generic-2",
        start: localISO(2026, 6, 27, 3, 30),
        end: localISO(2026, 6, 27, 6, 0),
        value: "ASLEEP",
    }),
    sample({
        id: "generic-inbed",
        start: localISO(2026, 6, 26, 23, 45),
        end: localISO(2026, 6, 27, 6, 15),
        value: "INBED",
    }),
]);
assert.equal(generic.sleep?.timeAsleepMinutes, 365, "Intervalos solapados se unen.");
assert.equal(generic.sleep?.timeInBedMinutes, 390);

const previousEveningStages = normalizeHealthKitSleepSamples("2026-05-31", [
    sample({
        id: "previous-rem",
        start: localISO(2026, 4, 30, 23, 0),
        end: localISO(2026, 4, 30, 23, 10),
        value: "REM",
        ...watch,
    }),
    sample({
        id: "previous-core",
        start: localISO(2026, 4, 30, 23, 10),
        end: localISO(2026, 4, 30, 23, 40),
        value: "CORE",
        ...watch,
    }),
    sample({
        id: "previous-awake",
        start: localISO(2026, 4, 30, 23, 40),
        end: localISO(2026, 4, 30, 23, 45),
        value: "AWAKE",
        ...watch,
    }),
    sample({
        id: "cross-midnight-core",
        start: localISO(2026, 4, 30, 23, 45),
        end: localISO(2026, 4, 31, 0, 45),
        value: "CORE",
        ...watch,
    }),
    sample({
        id: "target-deep",
        start: localISO(2026, 4, 31, 0, 45),
        end: localISO(2026, 4, 31, 1, 0),
        value: "DEEP",
        ...watch,
    }),
    sample({
        id: "following-evening-core",
        start: localISO(2026, 4, 31, 20, 30),
        end: localISO(2026, 4, 31, 21, 0),
        value: "CORE",
        ...watch,
    }),
]);
assert.equal(previousEveningStages.sleep?.timeAsleepMinutes, 115);
assert.equal(previousEveningStages.sleep?.timeInBedMinutes, 120);
assert.equal(previousEveningStages.sleep?.awakeMinutes, 5);
assert.equal(previousEveningStages.sleep?.remMinutes, 10);
assert.equal(previousEveningStages.sleep?.coreMinutes, 90);
assert.equal(previousEveningStages.sleep?.deepMinutes, 15);
assert.equal(previousEveningStages.diagnostics.targetDateSampleCount, 5);
assert.deepEqual(
    previousEveningStages.diagnostics.availableNightKeys,
    ["2026-05-31", "2026-06-01"],
    "Las etapas previas a medianoche deben pertenecer al día de despertar."
);

const noTarget = normalizeHealthKitSleepSamples(targetDate, [
    sample({
        id: "next-night",
        start: localISO(2026, 6, 27, 23, 0),
        end: localISO(2026, 6, 28, 6, 0),
        value: "ASLEEP",
    }),
]);
assert.equal(noTarget.sleep, null);
assert.equal(noTarget.diagnostics.outcome, "no-target-night");

const longerPhoneSource = normalizeHealthKitSleepSamples(targetDate, [
    sample({
        id: "watch-core-short",
        start: localISO(2026, 6, 27, 1, 0),
        end: localISO(2026, 6, 27, 2, 0),
        value: 3,
        ...watch,
    }),
    sample({
        id: "phone-core-long",
        start: localISO(2026, 6, 27, 0, 0),
        end: localISO(2026, 6, 27, 3, 0),
        value: 3,
        sourceId: "phone.sleep",
        sourceName: "iPhone Sleep",
    }),
    sample({
        id: "phone-deep-long",
        start: localISO(2026, 6, 27, 3, 0),
        end: localISO(2026, 6, 27, 4, 0),
        value: 4,
        sourceId: "phone.sleep",
        sourceName: "iPhone Sleep",
    }),
    { id: "invalid", value: 5 },
]);
assert.equal(longerPhoneSource.sleep?.sourceDevice, "iPhone Sleep");
assert.equal(longerPhoneSource.sleep?.timeAsleepMinutes, 240);
assert.equal(longerPhoneSource.diagnostics.rejectedSampleCount, 1);


const overlappingStages = normalizeHealthKitSleepSamples(targetDate, [
    sample({
        id: "overlap-core",
        start: localISO(2026, 6, 27, 0, 0),
        end: localISO(2026, 6, 27, 2, 0),
        value: "CORE",
        ...watch,
    }),
    sample({
        id: "overlap-rem",
        start: localISO(2026, 6, 27, 1, 0),
        end: localISO(2026, 6, 27, 3, 0),
        value: "REM",
        ...watch,
    }),
    sample({
        id: "short-inbed",
        start: localISO(2026, 6, 27, 0, 30),
        end: localISO(2026, 6, 27, 2, 30),
        value: "INBED",
        ...watch,
    }),
]);
assert.equal(overlappingStages.sleep?.timeAsleepMinutes, 180);
assert.equal(overlappingStages.sleep?.coreMinutes, 60);
assert.equal(overlappingStages.sleep?.remMinutes, 120);
assert.equal(
    overlappingStages.sleep?.timeInBedMinutes,
    180,
    "Un INBED incompleto no puede reducir el tiempo en cama por debajo del sueño unido."
);


const partialDetailedVsCompleteGeneric = normalizeHealthKitSleepSamples(targetDate, [
    sample({
        id: "partial-watch-core",
        start: localISO(2026, 6, 27, 1, 0),
        end: localISO(2026, 6, 27, 2, 0),
        value: "CORE",
        ...watch,
    }),
    sample({
        id: "complete-health-asleep",
        start: localISO(2026, 6, 27, 0, 0),
        end: localISO(2026, 6, 27, 6, 0),
        value: "ASLEEP",
        ...health,
    }),
]);
assert.equal(partialDetailedVsCompleteGeneric.sleep?.sourceDevice, "Health");
assert.equal(partialDetailedVsCompleteGeneric.sleep?.timeAsleepMinutes, 360);
assert.equal(partialDetailedVsCompleteGeneric.sleep?.coreMinutes, null);

const unknownStages = normalizeHealthKitSleepSamples(targetDate, [
    sample({
        id: "unknown-watch-stage",
        start: localISO(2026, 6, 27, 0, 0),
        end: localISO(2026, 6, 27, 1, 0),
        value: "UNKNOWN",
        ...watch,
    }),
]);
assert.equal(unknownStages.sleep, null);
assert.equal(unknownStages.diagnostics.outcome, "no-meaningful-sleep");
assert.deepEqual(
    unknownStages.diagnostics.unknownValues,
    ["UNKNOWN"],
    "El diagnóstico debe conservar etapas desconocidas aunque no pueda formar una noche."
);

const healthIndex = fs.readFileSync(HEALTH_INDEX_PATH, "utf8");
assert.match(
    healthIndex,
    /new Proxy\(/,
    "react-native-health debe obtener AppleHealthKit mediante el Proxy diferido."
);

const healthQueries = fs.readFileSync(HEALTH_QUERIES_PATH, "utf8");
for (const nativeStage of ["AWAKE", "CORE", "DEEP", "REM"]) {
    assert.match(
        healthQueries,
        new RegExp(`valueString = @"${nativeStage}"`),
        `react-native-health debe mapear ${nativeStage}.`
    );
}

console.log("✓ HealthKit sleep normalizer: 8 escenarios verificados.");
console.log("✓ react-native-health 1.19.0: etapas AWAKE, CORE, DEEP y REM verificadas.");
console.log("✓ react-native-health: Proxy diferido para New Architecture verificado.");
