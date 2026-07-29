// /scripts/verify-date-boundaries.cjs
// Verifies local-day timezone behavior, DST boundaries, and midnight overlap.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const ts = require("typescript");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const HELPER_PATH = path.join(
    PROJECT_ROOT,
    "src/utils/dates/localDateTime.ts",
);

function loadHelpers() {
    const source = fs.readFileSync(HELPER_PATH, "utf8");
    const transpiled = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
            strict: true,
        },
        fileName: HELPER_PATH,
        reportDiagnostics: true,
    });

    const errors = (transpiled.diagnostics ?? []).filter(
        (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
    );
    assert.equal(errors.length, 0, `${HELPER_PATH} must transpile cleanly.`);

    const moduleValue = { exports: {} };
    const execute = new Function(
        "require",
        "module",
        "exports",
        transpiled.outputText,
    );
    execute(require, moduleValue, moduleValue.exports);
    return moduleValue.exports;
}

function hoursBetween(startAt, endAt) {
    return (new Date(endAt).getTime() - new Date(startAt).getTime()) / 3_600_000;
}

function runChildAssertions() {
    const helpers = loadHelpers();
    const timezone = process.env.TZ;

    const regularDay = helpers.buildLocalDayRangeISO("2026-07-28");
    assert.equal(
        helpers.resolveLocalISODateFromDateTime(regularDay.startAt),
        "2026-07-28",
        `${timezone}: local midnight shifted to another date.`,
    );
    assert.equal(
        helpers.resolveLocalISODateFromDateTime(regularDay.endAtExclusive),
        "2026-07-29",
        `${timezone}: next local midnight shifted incorrectly.`,
    );

    assert.deepEqual(
        helpers.enumerateLocalDatesInDateTimeRange(
            regularDay.startAt,
            regularDay.endAtExclusive,
        ),
        ["2026-07-28"],
        `${timezone}: an exclusive midnight end added an extra date.`,
    );

    const firstDay = helpers.buildLocalDayRangeISO("2026-07-28");
    const secondDay = helpers.buildLocalDayRangeISO("2026-07-29");
    const crossingStart = new Date(
        new Date(firstDay.endAtExclusive).getTime() - 10 * 60_000,
    ).toISOString();
    const crossingEnd = new Date(
        new Date(secondDay.startAt).getTime() + 20 * 60_000,
    ).toISOString();

    assert.deepEqual(
        helpers.enumerateLocalDatesInDateTimeRange(crossingStart, crossingEnd),
        ["2026-07-28", "2026-07-29"],
        `${timezone}: a range crossing midnight did not include both days.`,
    );
    assert.equal(
        helpers.doesDateTimeRangeOverlapLocalDay(
            crossingStart,
            crossingEnd,
            "2026-07-28",
        ),
        true,
        `${timezone}: crossing session did not overlap its first day.`,
    );
    assert.equal(
        helpers.doesDateTimeRangeOverlapLocalDay(
            crossingStart,
            crossingEnd,
            "2026-07-29",
        ),
        true,
        `${timezone}: crossing session did not overlap its second day.`,
    );

    if (timezone === "America/Mexico_City") {
        assert.equal(
            helpers.resolveLocalISODateFromDateTime("2026-07-28T05:30:00.000Z"),
            "2026-07-27",
            "Mexico City: a late-evening instant was assigned to the UTC day.",
        );
    }

    if (timezone === "America/Los_Angeles") {
        const spring = helpers.buildLocalDayRangeISO("2026-03-08");
        const autumn = helpers.buildLocalDayRangeISO("2026-11-01");
        assert.equal(hoursBetween(spring.startAt, spring.endAtExclusive), 23);
        assert.equal(hoursBetween(autumn.startAt, autumn.endAtExclusive), 25);
    }

    console.log(`✓ ${timezone}: fechas locales y cruces de medianoche verificados.`);
}

if (process.argv.includes("--child")) {
    runChildAssertions();
    process.exit(0);
}

const timezones = [
    "America/Mexico_City",
    "America/Los_Angeles",
    "UTC",
];

for (const timezone of timezones) {
    const result = spawnSync(process.execPath, [__filename, "--child"], {
        cwd: PROJECT_ROOT,
        env: { ...process.env, TZ: timezone },
        encoding: "utf8",
    });

    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    assert.equal(result.status, 0, `Falló la validación en ${timezone}.`);
}

console.log("✓ Timezone QA: 3 zonas horarias verificadas.");
