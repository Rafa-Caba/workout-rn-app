// scripts/verify-insights.cjs
// Compiles and verifies pure Insights helpers without starting Expo or calling the API.

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const helperPath = path.join(
    projectRoot,
    "src/features/insights/utils/insights.helpers.ts",
);

function loadHelpers() {
    const source = fs.readFileSync(helperPath, "utf8");
    const compiled = ts.transpileModule(source, {
        compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.CommonJS,
            strict: true,
        },
        fileName: helperPath,
        reportDiagnostics: true,
    });

    const diagnostics = compiled.diagnostics ?? [];
    if (diagnostics.length > 0) {
        const messages = diagnostics.map((diagnostic) =>
            ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
        );
        throw new Error(messages.join("\n"));
    }

    const loadedModule = { exports: {} };
    const context = {
        module: loadedModule,
        exports: loadedModule.exports,
        require,
        console,
        Intl,
        Number,
        Math,
        Error,
    };

    vm.runInNewContext(compiled.outputText, context, { filename: helperPath });
    return loadedModule.exports;
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const helpers = loadHelpers();

assert(
    helpers.getRangeValidationMessage("2026-07-01", "2026-07-28") === null,
    "El rango válido fue rechazado.",
);
assert(
    helpers.getRangeValidationMessage("2026-07-29", "2026-07-28") !== null,
    "El rango invertido no fue detectado.",
);
assert(helpers.formatMinutes(366) === "6h 6m", "El formato de minutos no coincide.");
assert(helpers.formatSeconds(733) === "12m 13s", "El formato de segundos no coincide.");
assert(
    helpers.formatMetricValue("paceSecPerKm", 733) === "12m 13s /km",
    "El formato de ritmo no coincide.",
);
assert(
    helpers.formatMetricValue("distanceKm", 0.01) === "0.01 km",
    "El formato de distancia no coincide.",
);
assert(
    helpers.averageNumbers([10, null, 20, undefined]) === 15,
    "El promedio no ignora valores vacíos correctamente.",
);
assert(
    helpers.getLatestRecoveryLevel([{ level: "green" }, { level: "unknown" }]) === "green",
    "El último nivel conocido de recuperación no coincide.",
);

console.log("✓ Insights: 8 verificaciones de filtros, formatos y promedios pasaron.");
