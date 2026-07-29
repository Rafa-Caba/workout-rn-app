// scripts/verify-cardio-healthkit-route.cjs
// Verifies HealthKit outdoor classification, separate workout-route reads,
// derived cardio metrics, expanded route permission, and stale-error handling.

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function loadTypeScriptModule(relativePath) {
    const filePath = path.join(root, relativePath);
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

const environmentMapper = loadTypeScriptModule(
    "src/utils/health/cardio/cardioEnvironment.mapper.ts"
);
const routeMapper = loadTypeScriptModule(
    "src/services/health/bridge/healthRoute.mapper.ts"
);
const metrics = loadTypeScriptModule(
    "src/utils/health/cardio/cardioImportedMetrics.utils.ts"
);

const outdoorEnvironment = environmentMapper.detectCardioEnvironmentFromRaw({
    metadata: {
        HKIndoorWorkout: 0,
    },
});
const indoorEnvironment = environmentMapper.detectCardioEnvironmentFromRaw({
    metadata: {
        HKIndoorWorkout: 1,
    },
});

assert(
    outdoorEnvironment === "outdoor",
    "HKIndoorWorkout=0 must classify the workout as outdoor."
);
assert(
    indoorEnvironment === "indoor",
    "HKIndoorWorkout=1 must classify the workout as indoor."
);

const route = routeMapper.extractImportedWorkoutRoute({
    anchor: "sample-anchor",
    data: {
        locations: [
            {
                latitude: 20.7185,
                longitude: -103.291,
                altitude: 1624,
                speed: 1.1,
                timestamp: "2026-05-31T12:00:00.000Z",
            },
            {
                latitude: 20.7186,
                longitude: -103.2911,
                altitude: 1626,
                speed: 1.4,
                timestamp: "2026-05-31T12:00:05.000Z",
            },
        ],
    },
});

assert(route?.hasRoute === true, "Nested HealthKit route response must be detected.");
assert(route?.points.length === 2, "All valid nested HealthKit locations must survive.");
assert(route?.points[1]?.altitudeM === 1626, "Route altitude must be normalized.");

const paceSecPerKm = metrics.resolvePaceSecPerKm({
    paceSecPerKm: null,
    durationSeconds: 2715,
    distanceKm: 2.2039181323070083,
});
const avgSpeedKmh = metrics.resolveAverageSpeedKmh({
    avgSpeedKmh: null,
    durationSeconds: 2715,
    distanceKm: 2.2039181323070083,
});
const elevationGainM = metrics.resolveElevationGainMFromRoute([
    { altitudeM: 100 },
    { altitudeM: 100.2 },
    { altitudeM: 101.5 },
    { altitudeM: 103.2 },
    { altitudeM: 102.1 },
    { altitudeM: 105.8 },
    { altitudeM: 108.1 },
]);

assert(paceSecPerKm === 1232, "45:15 over 2.2039 km must derive to 20:32/km.");
assert(avgSpeedKmh === 2.92, "Average speed must derive to 2.92 km/h.");
assert(
    typeof elevationGainM === "number" && elevationGainM > 0,
    "Route altitudes must derive a positive elevation gain."
);

const iosBridgeSource = fs.readFileSync(
    path.join(root, "src/services/health/bridge/healthIOS.bridge.ts"),
    "utf8"
);
const iosCardioSource = fs.readFileSync(
    path.join(root, "src/services/health/cardio/cardioIOS.service.ts"),
    "utf8"
);
const diagnosticsSource = fs.readFileSync(
    path.join(root, "src/features/health/cardio/screens/CardioDiagnosticsScreen.tsx"),
    "utf8"
);
const permissionHookSource = fs.readFileSync(
    path.join(root, "src/hooks/health/cardio/useCardioPermissions.ts"),
    "utf8"
);

assert(
    iosBridgeSource.includes("permissionsMap.WorkoutRoute"),
    "The iOS workout scope must include HealthKit WorkoutRoute permission."
);
assert(
    iosBridgeSource.includes('getHealthKitMethod("getWorkoutRouteSamples")'),
    "The iOS bridge must resolve getWorkoutRouteSamples at call time."
);
assert(
    iosBridgeSource.includes("async readWorkoutRouteById"),
    "The shared bridge must expose route reads by workout UUID."
);
assert(
    iosCardioSource.includes("readWorkoutRouteById({ externalId })"),
    "Cardio import must query the separate HealthKit route by workout UUID."
);
assert(
    iosCardioSource.indexOf("await enrichCardioWorkout") <
        iosCardioSource.lastIndexOf("matchesRequestedCardioEnvironments"),
    "Environment filtering must happen after route enrichment."
);
assert(
    diagnosticsSource.includes("latestTerminalEvent?.kind === \"cardio-sync-error\""),
    "Diagnostics must suppress an older error after a newer successful result."
);
assert(
    permissionHookSource.includes("health.cardio.permissions.granted.v2"),
    "Existing installations must request the expanded route scope once."
);

console.log(
    "✓ HealthKit cardio route: outdoor classification, GPS route query, derived metrics, and current-error state verified."
);
