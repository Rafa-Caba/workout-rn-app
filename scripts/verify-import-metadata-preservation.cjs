// /scripts/verify-import-metadata-preservation.cjs
// Verifies that manual Sleep and Gym Check edits preserve imported metadata.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const SLEEP_DRAFT_PATH = path.join(
    PROJECT_ROOT,
    "src/features/sleep/components/sleepDraft.ts"
);
const GYM_SESSION_META_PATH = path.join(
    PROJECT_ROOT,
    "src/utils/gymCheck/sessionMeta.ts"
);

function loadTypeScriptModule(filePath) {
    const source = fs.readFileSync(filePath, "utf8");
    const transpiled = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
            esModuleInterop: true,
            strict: true,
        },
        fileName: filePath,
        reportDiagnostics: true,
    });

    const errors = (transpiled.diagnostics ?? []).filter(
        (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
    );
    assert.equal(errors.length, 0, `${filePath} must transpile cleanly.`);

    const moduleValue = { exports: {} };
    const execute = new Function(
        "require",
        "module",
        "exports",
        transpiled.outputText
    );
    execute(
        (request) => {
            throw new Error(`Unexpected runtime dependency: ${request}`);
        },
        moduleValue,
        moduleValue.exports
    );

    return moduleValue.exports;
}

const sleepDraftModule = loadTypeScriptModule(SLEEP_DRAFT_PATH);
const gymSessionMetaModule = loadTypeScriptModule(GYM_SESSION_META_PATH);

const importedSleep = {
    timeAsleepMinutes: 462,
    timeInBedMinutes: 484,
    score: null,
    awakeMinutes: 22,
    remMinutes: 139,
    coreMinutes: 294,
    deepMinutes: 29,
    source: "healthkit",
    sourceDevice: "Rafael's Apple Watch",
    importedAt: "2026-07-30T19:42:00.000Z",
    lastSyncedAt: "2026-07-30T19:42:00.000Z",
    raw: null,
};

const sleepDraft = sleepDraftModule.toSleepDraft(importedSleep);
sleepDraft.score = "95";
const updatedSleep = sleepDraftModule.normalizeSleepDraft(sleepDraft);

assert.equal(updatedSleep.score, 95);
assert.equal(updatedSleep.source, "healthkit");
assert.equal(updatedSleep.sourceDevice, "Rafael's Apple Watch");
assert.equal(updatedSleep.importedAt, importedSleep.importedAt);
assert.equal(updatedSleep.lastSyncedAt, importedSleep.lastSyncedAt);

const existingGymMeta = {
    sessionKey: "gym_check",
    sessionKind: "device-import",
    source: "healthkit",
    sourceDevice: "Rafael's Apple Watch",
    importedAt: "2026-07-29T15:00:00.000Z",
    lastSyncedAt: "2026-07-29T15:00:00.000Z",
    externalId: "HK-WORKOUT-123",
    originalType: "TraditionalStrengthTraining",
    provider: "healthkit",
    totalKcalEstimated: true,
};

const manualGymPatch = {
    sessionKey: "gym_check",
    sessionKind: "gym-check",
    dayEffortRpe: 8,
    source: null,
    sourceDevice: null,
    importedAt: null,
    lastSyncedAt: null,
};

const mergedGymMeta = gymSessionMetaModule.mergeGymCheckSessionMeta(
    existingGymMeta,
    manualGymPatch
);

assert.equal(mergedGymMeta.dayEffortRpe, 8);
assert.equal(mergedGymMeta.sessionKind, "gym-check");
assert.equal(mergedGymMeta.source, "healthkit");
assert.equal(mergedGymMeta.sourceDevice, "Rafael's Apple Watch");
assert.equal(mergedGymMeta.importedAt, existingGymMeta.importedAt);
assert.equal(mergedGymMeta.lastSyncedAt, existingGymMeta.lastSyncedAt);
assert.equal(mergedGymMeta.externalId, "HK-WORKOUT-123");
assert.equal(mergedGymMeta.provider, "healthkit");

console.log("✓ Sleep: manual score edits preserve Health import metadata.");
console.log("✓ Gym Check: manual RPE edits preserve imported session provenance.");
