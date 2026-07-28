// /src/utils/health/healthSleep.normalizer.ts

import { toHealthDiagnosticJson } from "@/src/services/health/diagnostics/healthDiagnostics.service";
import type { HealthImportedSleep } from "@/src/types/health/cardio/health.types";
import type {
    HealthSleepDiagnosticSample,
    HealthSleepNightSummary,
    HealthSleepNormalizedTotals,
    HealthSleepQueryRange,
    HealthSleepSourceSummary,
    HealthSleepStageBucket,
} from "@/src/types/health/healthDiagnostics.types";
import type { ISODate } from "@/src/types/workoutDay.types";

const MS_PER_MINUTE = 60_000;
const NIGHT_CLUSTER_MAX_GAP_MS = 60 * MS_PER_MINUTE;
const SOURCE_COMPLETENESS_RATIO = 0.8;
const DIAGNOSTIC_SAMPLE_LIMIT = 30;

type DateParts = {
    year: number;
    monthIndex: number;
    day: number;
};

type SleepInterval = {
    startMs: number;
    endMs: number;
};

type NormalizedSleepSample = SleepInterval & {
    id: string | null;
    dedupeKey: string;
    startDate: string;
    endDate: string;
    value: string | null;
    bucket: HealthSleepStageBucket;
    sourceId: string | null;
    sourceName: string | null;
    sourceKey: string;
    nightKey: ISODate;
    raw: unknown;
};

type SourceAggregation = {
    sourceKey: string;
    sourceId: string | null;
    sourceName: string | null;
    samples: NormalizedSleepSample[];
    detailedStageMs: number;
    genericAsleepMs: number;
    inBedMs: number;
    awakeMs: number;
};

type SleepNightCluster = {
    startMs: number;
    endMs: number;
    meaningfulSleepMs: number;
    samples: NormalizedSleepSample[];
};

export type HealthSleepNormalizationDiagnostics = {
    receivedSampleCount: number;
    validSampleCount: number;
    rejectedSampleCount: number;
    duplicateSampleCount: number;
    targetDateSampleCount: number;
    targetNightSampleCount: number;
    discardedTargetDateSampleCount: number;
    availableNightKeys: ISODate[];
    nightSummaries: HealthSleepNightSummary[];
    unknownValues: string[];
    selectedSourceKey: string | null;
    sourceSummaries: HealthSleepSourceSummary[];
    totals: HealthSleepNormalizedTotals;
    outcome: "normalized" | "no-samples" | "no-target-night" | "no-meaningful-sleep";
    diagnosticSamples: HealthSleepDiagnosticSample[];
    diagnosticSamplesTruncated: boolean;
};

export type HealthSleepNormalizationResult = {
    sleep: HealthImportedSleep | null;
    diagnostics: HealthSleepNormalizationDiagnostics;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseDateParts(date: ISODate): DateParts | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
        return null;
    }

    const candidate = new Date(year, month - 1, day, 12, 0, 0, 0);
    if (
        candidate.getFullYear() !== year ||
        candidate.getMonth() !== month - 1 ||
        candidate.getDate() !== day
    ) {
        return null;
    }

    return {
        year,
        monthIndex: month - 1,
        day,
    };
}

function formatLocalISODate(date: Date): ISODate {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/**
 * Queries from noon on the previous local day through 18:00 on the target day.
 * The extended end protects late wake-ups while the normalizer still assigns
 * samples to the target day using each interval's local end date.
 */
export function buildHealthKitSleepQueryRange(targetDate: ISODate): HealthSleepQueryRange {
    const parts = parseDateParts(targetDate);
    if (!parts) {
        throw new Error(`Invalid sleep target date: ${targetDate}`);
    }

    const start = new Date(parts.year, parts.monthIndex, parts.day - 1, 12, 0, 0, 0);
    const end = new Date(parts.year, parts.monthIndex, parts.day, 18, 0, 0, 0);

    return {
        targetDate,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        strategy: "previous-noon-to-target-evening",
    };
}

function readNonEmptyString(record: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
        const value = record[key];
        if (typeof value !== "string") continue;

        const trimmed = value.trim();
        if (trimmed) return trimmed;
    }

    return null;
}

function readDateString(record: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
        const value = record[key];

        if (typeof value === "string" && Number.isFinite(new Date(value).getTime())) {
            return new Date(value).toISOString();
        }

        if (value instanceof Date && Number.isFinite(value.getTime())) {
            return value.toISOString();
        }
    }

    return null;
}

function readRawStageValue(record: Record<string, unknown>): unknown {
    return record.value ?? record.stage ?? record.sleepAnalysis ?? record.categoryValue ?? null;
}

function normalizeStageText(value: string): string {
    return value.toLowerCase().replace(/[\s_.-]+/g, "");
}

export function classifyHealthKitSleepStage(value: unknown): HealthSleepStageBucket {
    const numeric =
        typeof value === "number"
            ? value
            : typeof value === "string" && /^\d+$/.test(value.trim())
                ? Number(value.trim())
                : null;

    if (numeric === 0) return "in-bed";
    if (numeric === 1) return "asleep";
    if (numeric === 2) return "awake";
    if (numeric === 3) return "core";
    if (numeric === 4) return "deep";
    if (numeric === 5) return "rem";

    if (typeof value !== "string") return "unknown";

    const normalized = normalizeStageText(value);

    if (normalized.includes("awake")) return "awake";
    if (normalized.includes("asleeprem") || normalized === "rem") return "rem";
    if (normalized.includes("asleepdeep") || normalized === "deep") return "deep";
    if (
        normalized.includes("asleepcore") ||
        normalized === "core" ||
        normalized.includes("light")
    ) {
        return "core";
    }
    if (normalized.includes("inbed")) return "in-bed";
    if (normalized.includes("asleep")) return "asleep";

    return "unknown";
}

function createSourceKey(sourceId: string | null, sourceName: string | null): string {
    if (sourceId && sourceName) return `${sourceId}::${sourceName}`;
    return sourceId ?? sourceName ?? "unknown-source";
}

function createDedupeKey(input: {
    id: string | null;
    startDate: string;
    endDate: string;
    bucket: HealthSleepStageBucket;
    sourceKey: string;
}): string {
    return input.id ?? [input.sourceKey, input.startDate, input.endDate, input.bucket].join("|");
}

function parseSleepSample(value: unknown): NormalizedSleepSample | null {
    if (!isRecord(value)) return null;

    const startDate = readDateString(value, ["startDate", "start"]);
    const endDate = readDateString(value, ["endDate", "end"]);

    if (!startDate || !endDate) return null;

    const startMs = new Date(startDate).getTime();
    const endMs = new Date(endDate).getTime();

    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
        return null;
    }

    const rawStageValue = readRawStageValue(value);
    const bucket = classifyHealthKitSleepStage(rawStageValue);
    const sourceId = readNonEmptyString(value, ["sourceId", "sourceBundleId", "bundleId"]);
    const sourceName = readNonEmptyString(value, ["sourceName", "source", "device"]);
    const sourceKey = createSourceKey(sourceId, sourceName);
    const id = readNonEmptyString(value, ["id", "uuid"]);
    const nightKey = formatLocalISODate(new Date(endMs));
    const stageValue =
        typeof rawStageValue === "string" || typeof rawStageValue === "number"
            ? String(rawStageValue)
            : null;

    return {
        id,
        dedupeKey: createDedupeKey({ id, startDate, endDate, bucket, sourceKey }),
        startDate,
        endDate,
        startMs,
        endMs,
        value: stageValue,
        bucket,
        sourceId,
        sourceName,
        sourceKey,
        nightKey,
        raw: value,
    };
}

function mergeIntervals(intervals: SleepInterval[]): SleepInterval[] {
    if (intervals.length === 0) return [];

    const sorted = [...intervals].sort((left, right) => left.startMs - right.startMs);
    const merged: SleepInterval[] = [];
    let current: SleepInterval = { ...sorted[0] };

    for (let index = 1; index < sorted.length; index += 1) {
        const interval = sorted[index];

        if (interval.startMs <= current.endMs) {
            current.endMs = Math.max(current.endMs, interval.endMs);
            continue;
        }

        merged.push(current);
        current = { ...interval };
    }

    merged.push(current);
    return merged;
}

function unionDurationMs(intervals: SleepInterval[]): number {
    return mergeIntervals(intervals).reduce(
        (total, interval) => total + (interval.endMs - interval.startMs),
        0
    );
}

function overlapDurationMs(left: SleepInterval[], right: SleepInterval[]): number {
    const leftMerged = mergeIntervals(left);
    const rightMerged = mergeIntervals(right);
    let leftIndex = 0;
    let rightIndex = 0;
    let total = 0;

    while (leftIndex < leftMerged.length && rightIndex < rightMerged.length) {
        const leftInterval = leftMerged[leftIndex];
        const rightInterval = rightMerged[rightIndex];
        const overlapStart = Math.max(leftInterval.startMs, rightInterval.startMs);
        const overlapEnd = Math.min(leftInterval.endMs, rightInterval.endMs);

        if (overlapEnd > overlapStart) {
            total += overlapEnd - overlapStart;
        }

        if (leftInterval.endMs <= rightInterval.endMs) {
            leftIndex += 1;
        } else {
            rightIndex += 1;
        }
    }

    return total;
}

function roundMinutes(milliseconds: number): number {
    return Math.max(0, Math.round(milliseconds / MS_PER_MINUTE));
}

function nullableMinutes(milliseconds: number): number | null {
    const rounded = roundMinutes(milliseconds);
    return rounded > 0 ? rounded : null;
}

function intervalsForBucket(
    samples: NormalizedSleepSample[],
    bucket: HealthSleepStageBucket
): SleepInterval[] {
    return samples
        .filter((sample) => sample.bucket === bucket)
        .map((sample) => ({ startMs: sample.startMs, endMs: sample.endMs }));
}

type DetailedStageDurations = {
    remMs: number;
    coreMs: number;
    deepMs: number;
    totalMs: number;
};

function detailedStagePriority(bucket: HealthSleepStageBucket): number {
    if (bucket === "deep") return 3;
    if (bucket === "rem") return 2;
    if (bucket === "core") return 1;
    return 0;
}

/**
 * Resolves accidental overlaps between detailed stages into one timeline.
 * The interval whose transition started most recently wins; an explicit stage
 * priority is used only for otherwise identical conflicting samples.
 */
function calculateDetailedStageDurations(
    samples: NormalizedSleepSample[]
): DetailedStageDurations {
    const detailed = samples.filter(
        (sample) =>
            sample.bucket === "rem" || sample.bucket === "core" || sample.bucket === "deep"
    );

    const boundaries = Array.from(
        new Set(detailed.flatMap((sample) => [sample.startMs, sample.endMs]))
    ).sort((left, right) => left - right);

    const totals: DetailedStageDurations = {
        remMs: 0,
        coreMs: 0,
        deepMs: 0,
        totalMs: 0,
    };

    for (let index = 0; index < boundaries.length - 1; index += 1) {
        const startMs = boundaries[index];
        const endMs = boundaries[index + 1];
        if (endMs <= startMs) continue;

        const selected = detailed
            .filter((sample) => sample.startMs <= startMs && sample.endMs >= endMs)
            .sort((left, right) => {
                if (right.startMs !== left.startMs) return right.startMs - left.startMs;
                if (left.endMs !== right.endMs) return left.endMs - right.endMs;
                return detailedStagePriority(right.bucket) - detailedStagePriority(left.bucket);
            })[0];

        if (!selected) continue;

        const durationMs = endMs - startMs;
        totals.totalMs += durationMs;

        if (selected.bucket === "rem") totals.remMs += durationMs;
        if (selected.bucket === "core") totals.coreMs += durationMs;
        if (selected.bucket === "deep") totals.deepMs += durationMs;
    }

    return totals;
}

function aggregateSource(samples: NormalizedSleepSample[]): SourceAggregation {
    const first = samples[0];
    const detailedIntervals = samples
        .filter((sample) =>
            sample.bucket === "rem" || sample.bucket === "core" || sample.bucket === "deep"
        )
        .map((sample) => ({ startMs: sample.startMs, endMs: sample.endMs }));

    return {
        sourceKey: first.sourceKey,
        sourceId: first.sourceId,
        sourceName: first.sourceName,
        samples,
        detailedStageMs: unionDurationMs(detailedIntervals),
        genericAsleepMs: unionDurationMs(intervalsForBucket(samples, "asleep")),
        inBedMs: unionDurationMs(intervalsForBucket(samples, "in-bed")),
        awakeMs: unionDurationMs(intervalsForBucket(samples, "awake")),
    };
}

function isAppleWatchSource(source: SourceAggregation): boolean {
    const label = `${source.sourceId ?? ""} ${source.sourceName ?? ""}`.toLowerCase();
    return label.includes("watch");
}

function meaningfulSleepDurationMs(source: SourceAggregation): number {
    return Math.max(source.detailedStageMs, source.genericAsleepMs);
}

function sourceScore(source: SourceAggregation): number {
    const hasDetailedStages = source.detailedStageMs > 0 ? 1 : 0;
    const appleWatchBonus = isAppleWatchSource(source) ? 1 : 0;

    return (
        hasDetailedStages * 1_000_000_000_000 +
        meaningfulSleepDurationMs(source) * 100 +
        appleWatchBonus * 1_000_000 +
        source.samples.length
    );
}

function pickPrimarySource(sources: SourceAggregation[]): SourceAggregation | null {
    if (sources.length === 0) return null;

    const maxDurationMs = Math.max(...sources.map(meaningfulSleepDurationMs));
    const completenessThresholdMs = maxDurationMs * SOURCE_COMPLETENESS_RATIO;
    const sufficientlyComplete = sources.filter(
        (source) => meaningfulSleepDurationMs(source) >= completenessThresholdMs
    );

    // Detailed stages are preferred only among sources covering at least 80% of
    // the longest source. A partial Watch fragment cannot replace a full night.
    return [...sufficientlyComplete].sort(
        (left, right) => sourceScore(right) - sourceScore(left)
    )[0];
}

function primarySleepIntervals(source: SourceAggregation): SleepInterval[] {
    const detailed = source.samples
        .filter((sample) =>
            sample.bucket === "rem" || sample.bucket === "core" || sample.bucket === "deep"
        )
        .map((sample) => ({ startMs: sample.startMs, endMs: sample.endMs }));

    return detailed.length > 0 ? detailed : intervalsForBucket(source.samples, "asleep");
}

function pickInBedSource(
    sources: SourceAggregation[],
    primary: SourceAggregation,
    sleepIntervals: SleepInterval[]
): SourceAggregation {
    const candidates = sources
        .filter((source) => source.inBedMs > 0)
        .map((source) => ({
            source,
            overlapMs: overlapDurationMs(
                intervalsForBucket(source.samples, "in-bed"),
                sleepIntervals
            ),
        }))
        .filter((candidate) => candidate.overlapMs > 0)
        .sort((left, right) => {
            if (right.overlapMs !== left.overlapMs) {
                return right.overlapMs - left.overlapMs;
            }

            if (right.source.inBedMs !== left.source.inBedMs) {
                return right.source.inBedMs - left.source.inBedMs;
            }

            return Number(right.source.sourceKey === primary.sourceKey) -
                Number(left.source.sourceKey === primary.sourceKey);
        });

    return candidates[0]?.source ?? primary;
}

function isMeaningfulSleepBucket(bucket: HealthSleepStageBucket): boolean {
    return bucket === "asleep" || bucket === "rem" || bucket === "core" || bucket === "deep";
}

function overlapsEnvelope(sample: SleepInterval, cluster: SleepNightCluster): boolean {
    return (
        sample.endMs >= cluster.startMs - NIGHT_CLUSTER_MAX_GAP_MS &&
        sample.startMs <= cluster.endMs + NIGHT_CLUSTER_MAX_GAP_MS
    );
}

function buildNightClusters(samples: NormalizedSleepSample[]): SleepNightCluster[] {
    const meaningful = samples
        .filter((sample) => isMeaningfulSleepBucket(sample.bucket))
        .sort((left, right) => left.startMs - right.startMs);

    if (meaningful.length === 0) return [];

    const envelopes: Array<{ startMs: number; endMs: number }> = [];
    let current = {
        startMs: meaningful[0].startMs,
        endMs: meaningful[0].endMs,
    };

    for (let index = 1; index < meaningful.length; index += 1) {
        const sample = meaningful[index];

        if (sample.startMs <= current.endMs + NIGHT_CLUSTER_MAX_GAP_MS) {
            current.endMs = Math.max(current.endMs, sample.endMs);
            continue;
        }

        envelopes.push(current);
        current = { startMs: sample.startMs, endMs: sample.endMs };
    }
    envelopes.push(current);

    return envelopes.map((envelope) => {
        const clusterSamples = samples.filter((sample) => overlapsEnvelope(sample, {
            ...envelope,
            meaningfulSleepMs: 0,
            samples: [],
        }));
        const meaningfulIntervals = clusterSamples
            .filter((sample) => isMeaningfulSleepBucket(sample.bucket))
            .map((sample) => ({ startMs: sample.startMs, endMs: sample.endMs }));

        return {
            ...envelope,
            meaningfulSleepMs: unionDurationMs(meaningfulIntervals),
            samples: clusterSamples,
        };
    });
}

function clusterCrossesLocalDate(cluster: SleepNightCluster): boolean {
    return formatLocalISODate(new Date(cluster.startMs)) !==
        formatLocalISODate(new Date(cluster.endMs));
}

function pickPrimaryNightCluster(clusters: SleepNightCluster[]): SleepNightCluster | null {
    if (clusters.length === 0) return null;

    return [...clusters].sort((left, right) => {
        if (right.meaningfulSleepMs !== left.meaningfulSleepMs) {
            return right.meaningfulSleepMs - left.meaningfulSleepMs;
        }

        const crossDateDifference =
            Number(clusterCrossesLocalDate(right)) - Number(clusterCrossesLocalDate(left));
        if (crossDateDifference !== 0) return crossDateDifference;

        return left.startMs - right.startMs;
    })[0];
}

function buildNightSummaries(
    clusters: SleepNightCluster[],
    selected: SleepNightCluster | null
): HealthSleepNightSummary[] {
    return clusters.map((cluster) => ({
        startDate: new Date(cluster.startMs).toISOString(),
        endDate: new Date(cluster.endMs).toISOString(),
        sampleCount: cluster.samples.length,
        meaningfulSleepMinutes: roundMinutes(cluster.meaningfulSleepMs),
        selected: cluster === selected,
    }));
}

function buildRawDiagnosticSample(value: unknown): HealthSleepDiagnosticSample {
    if (!isRecord(value)) {
        return {
            id: null,
            startDate: null,
            endDate: null,
            value: null,
            bucket: "unknown",
            sourceId: null,
            sourceName: null,
            durationMinutes: null,
            nightKey: null,
            raw: toHealthDiagnosticJson(value),
        };
    }

    const startDate = readDateString(value, ["startDate", "start"]);
    const endDate = readDateString(value, ["endDate", "end"]);
    const startMs = startDate ? new Date(startDate).getTime() : Number.NaN;
    const endMs = endDate ? new Date(endDate).getTime() : Number.NaN;
    const rawStageValue = readRawStageValue(value);

    return {
        id: readNonEmptyString(value, ["id", "uuid"]),
        startDate,
        endDate,
        value:
            typeof rawStageValue === "string" || typeof rawStageValue === "number"
                ? String(rawStageValue)
                : null,
        bucket: classifyHealthKitSleepStage(rawStageValue),
        sourceId: readNonEmptyString(value, ["sourceId", "sourceBundleId", "bundleId"]),
        sourceName: readNonEmptyString(value, ["sourceName", "source", "device"]),
        durationMinutes:
            Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs
                ? roundMinutes(endMs - startMs)
                : null,
        nightKey: Number.isFinite(endMs) ? formatLocalISODate(new Date(endMs)) : null,
        raw: toHealthDiagnosticJson(value),
    };
}

function emptyTotals(): HealthSleepNormalizedTotals {
    return {
        timeAsleepMinutes: null,
        timeInBedMinutes: null,
        awakeMinutes: null,
        remMinutes: null,
        coreMinutes: null,
        deepMinutes: null,
    };
}

function createBaseDiagnostics(
    receivedSampleCount: number,
    diagnosticSamples: HealthSleepDiagnosticSample[],
    truncated: boolean
): HealthSleepNormalizationDiagnostics {
    return {
        receivedSampleCount,
        validSampleCount: 0,
        rejectedSampleCount: receivedSampleCount,
        duplicateSampleCount: 0,
        targetDateSampleCount: 0,
        targetNightSampleCount: 0,
        discardedTargetDateSampleCount: 0,
        availableNightKeys: [],
        nightSummaries: [],
        unknownValues: [],
        selectedSourceKey: null,
        sourceSummaries: [],
        totals: emptyTotals(),
        outcome: receivedSampleCount === 0 ? "no-samples" : "no-meaningful-sleep",
        diagnosticSamples,
        diagnosticSamplesTruncated: truncated,
    };
}

/**
 * Normalizes HealthKit sleep intervals for one app day.
 *
 * Strategy:
 * 1. Parse and reject invalid intervals.
 * 2. Deduplicate by provider id or a stable interval/source key.
 * 3. Assign intervals to a night using their local end date.
 * 4. Group by source and select the strongest detailed-stage source.
 * 5. Union overlapping intervals before calculating totals.
 * 6. Prefer REM/Core/Deep totals over generic Asleep to avoid double counting.
 */
export function normalizeHealthKitSleepSamples(
    targetDate: ISODate,
    rawSamples: unknown[]
): HealthSleepNormalizationResult {
    const diagnosticSamples = rawSamples
        .slice(0, DIAGNOSTIC_SAMPLE_LIMIT)
        .map(buildRawDiagnosticSample);
    const diagnostics = createBaseDiagnostics(
        rawSamples.length,
        diagnosticSamples,
        rawSamples.length > DIAGNOSTIC_SAMPLE_LIMIT
    );
    const diagnosticCandidates = rawSamples
        .map(parseSleepSample)
        .filter((sample): sample is NormalizedSleepSample => sample !== null);

    if (rawSamples.length === 0) {
        return { sleep: null, diagnostics };
    }

    const validSamples = diagnosticCandidates;
    diagnostics.validSampleCount = validSamples.length;
    diagnostics.rejectedSampleCount = rawSamples.length - validSamples.length;

    const uniqueByKey = new Map<string, NormalizedSleepSample>();
    for (const sample of validSamples) {
        if (!uniqueByKey.has(sample.dedupeKey)) {
            uniqueByKey.set(sample.dedupeKey, sample);
        }
    }

    const deduped = [...uniqueByKey.values()];
    diagnostics.duplicateSampleCount = validSamples.length - deduped.length;
    diagnostics.availableNightKeys = Array.from(
        new Set(deduped.map((sample) => sample.nightKey))
    ).sort();

    const targetDateSamples = deduped.filter((sample) => sample.nightKey === targetDate);
    diagnostics.targetDateSampleCount = targetDateSamples.length;
    diagnostics.unknownValues = Array.from(
        new Set(
            targetDateSamples
                .filter((sample) => sample.bucket === "unknown")
                .map((sample) => sample.value ?? "[sin valor]")
        )
    ).sort();

    if (targetDateSamples.length === 0) {
        diagnostics.outcome = "no-target-night";
        return { sleep: null, diagnostics };
    }

    const nightClusters = buildNightClusters(targetDateSamples);
    const selectedNight = pickPrimaryNightCluster(nightClusters);
    diagnostics.nightSummaries = buildNightSummaries(nightClusters, selectedNight);

    if (!selectedNight) {
        diagnostics.outcome = "no-meaningful-sleep";
        diagnostics.discardedTargetDateSampleCount = targetDateSamples.length;
        return { sleep: null, diagnostics };
    }

    const targetNightSamples = selectedNight.samples;
    diagnostics.targetNightSampleCount = targetNightSamples.length;
    diagnostics.discardedTargetDateSampleCount =
        targetDateSamples.length - targetNightSamples.length;

    const bySource = new Map<string, NormalizedSleepSample[]>();
    for (const sample of targetNightSamples) {
        const group = bySource.get(sample.sourceKey) ?? [];
        group.push(sample);
        bySource.set(sample.sourceKey, group);
    }

    const sources = [...bySource.values()].map(aggregateSource);
    const primary = pickPrimarySource(sources);

    if (!primary) {
        diagnostics.outcome = "no-meaningful-sleep";
        return { sleep: null, diagnostics };
    }

    const selectedSleepIntervals = primarySleepIntervals(primary);
    const inBedSource = pickInBedSource(sources, primary, selectedSleepIntervals);
    const detailedDurations = calculateDetailedStageDurations(primary.samples);
    const remMs = detailedDurations.remMs;
    const coreMs = detailedDurations.coreMs;
    const deepMs = detailedDurations.deepMs;
    const detailedStageMs = detailedDurations.totalMs;
    const genericAsleepMs = unionDurationMs(intervalsForBucket(primary.samples, "asleep"));
    const awakeIntervals = intervalsForBucket(primary.samples, "awake");
    const awakeMs = unionDurationMs(awakeIntervals);
    const explicitInBedMs = inBedSource.inBedMs;

    const remMinutes = nullableMinutes(remMs);
    const coreMinutes = nullableMinutes(coreMs);
    const deepMinutes = nullableMinutes(deepMs);
    const timeAsleepMinutes =
        detailedStageMs > 0
            ? (remMinutes ?? 0) + (coreMinutes ?? 0) + (deepMinutes ?? 0)
            : nullableMinutes(genericAsleepMs);
    const awakeMinutes = nullableMinutes(awakeMs);
    const explicitInBedMinutes = nullableMinutes(explicitInBedMs);
    const fallbackTimeInBedMinutes = nullableMinutes(
        unionDurationMs([...selectedSleepIntervals, ...awakeIntervals])
    );
    const timeInBedMinutes =
        explicitInBedMinutes !== null &&
            (fallbackTimeInBedMinutes === null || explicitInBedMinutes >= fallbackTimeInBedMinutes)
            ? explicitInBedMinutes
            : fallbackTimeInBedMinutes;

    const totals: HealthSleepNormalizedTotals = {
        timeAsleepMinutes,
        timeInBedMinutes,
        awakeMinutes,
        remMinutes,
        coreMinutes,
        deepMinutes,
    };

    diagnostics.selectedSourceKey = primary.sourceKey;
    diagnostics.totals = totals;
    diagnostics.sourceSummaries = sources
        .map((source): HealthSleepSourceSummary => ({
            sourceKey: source.sourceKey,
            sourceId: source.sourceId,
            sourceName: source.sourceName,
            sampleCount: source.samples.length,
            detailedStageMinutes: roundMinutes(source.detailedStageMs),
            genericAsleepMinutes: roundMinutes(source.genericAsleepMs),
            inBedMinutes: roundMinutes(source.inBedMs),
            awakeMinutes: roundMinutes(source.awakeMs),
            selected: source.sourceKey === primary.sourceKey,
            selectedForInBed: source.sourceKey === inBedSource.sourceKey,
        }))
        .sort((left, right) => Number(right.selected) - Number(left.selected));

    if (timeAsleepMinutes === null) {
        diagnostics.outcome = "no-meaningful-sleep";
        return { sleep: null, diagnostics };
    }

    diagnostics.outcome = "normalized";
    const now = new Date().toISOString();

    return {
        sleep: {
            date: targetDate,
            timeAsleepMinutes,
            timeInBedMinutes,
            score: null,
            awakeMinutes,
            remMinutes,
            coreMinutes,
            deepMinutes,
            source: "healthkit",
            sourceDevice: primary.sourceName ?? primary.sourceId,
            importedAt: now,
            lastSyncedAt: now,
            raw: null,
        },
        diagnostics,
    };
}
