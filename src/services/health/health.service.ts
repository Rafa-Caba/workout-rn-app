// /src/services/health/health.service.ts
// Cross-platform Health facade plus Gym Check-specific workout selection.

import { Platform } from "react-native";

import {
    appendHealthDiagnosticEvent,
    createHealthDiagnosticId,
} from "@/src/services/health/diagnostics/healthDiagnostics.service";
import type { HealthPermissionKey } from "@/src/services/health/healthPermissionKeys";
import type {
    HealthImportedSleep,
    HealthImportedWorkoutMetrics,
    HealthImportedWorkoutSessionMinimal,
    HealthPermissionsStatus,
    HealthProvider,
} from "@/src/types/health/cardio/health.types";
import type { ISODate, ISODateTime } from "@/src/types/workoutDay.types";
import {
    GYM_CHECK_PROVIDER_WORKOUT_TYPE,
    getGymCheckHealthWorkoutCandidates,
    selectGymCheckHealthWorkout,
} from "@/src/utils/health/healthGymCheckWorkout.selector";
import { hasMeaningfulImportedWorkoutMetrics } from "@/src/utils/health/healthWorkout.mapper";
import { toHealthWorkoutDiagnosticSample } from "@/src/utils/health/healthWorkoutDiagnostics.mapper";

import {
    isHealthAndroidAvailable,
    readHealthAndroidMetricsByRange,
    readHealthAndroidSleepByDate,
    readHealthAndroidWorkoutsByDate,
    requestHealthAndroidPermissions,
} from "@/src/services/health/healthAndroid.service";
import {
    isHealthIOSAvailable,
    readHealthIOSMetricsByRange,
    readHealthIOSSleepByDate,
    readHealthIOSWorkoutsByDate,
    requestHealthIOSPermissions,
} from "@/src/services/health/healthIOS.service";

/**
 * Facade input types.
 */
export type HealthPermissionsRequest = {
    permissions: HealthPermissionKey[];
};

export type HealthReadSleepInput = {
    date: ISODate;
};

export type HealthReadWorkoutsInput = {
    date: ISODate;
};

export type HealthReadMetricsRangeInput = {
    from: ISODateTime;
    to: ISODateTime;
};

export type HealthGymCheckWorkoutReadResult = {
    provider: HealthProvider | null;
    targetWorkoutType: typeof GYM_CHECK_PROVIDER_WORKOUT_TYPE;
    workouts: HealthImportedWorkoutSessionMinimal[];
    matchingWorkouts: HealthImportedWorkoutSessionMinimal[];
    selected: HealthImportedWorkoutSessionMinimal | null;
};

function isIOS(): boolean {
    return Platform.OS === "ios";
}

function isAndroid(): boolean {
    return Platform.OS === "android";
}

function getCurrentProvider(): HealthProvider | null {
    if (isIOS()) return "healthkit";
    if (isAndroid()) return "health-connect";
    return null;
}

function buildUnavailablePermissionsStatus(): HealthPermissionsStatus {
    return {
        provider: getCurrentProvider() ?? "healthkit",
        available: false,
        permissions: {},
        checkedAt: new Date().toISOString(),
    };
}

function throwUnsupportedPlatform(): never {
    throw new Error("Health service is only supported on iOS and Android.");
}

function mergeGymCheckMetrics(
    workout: HealthImportedWorkoutSessionMinimal,
    rangeMetrics: HealthImportedWorkoutMetrics | null
): HealthImportedWorkoutSessionMinimal {
    return {
        ...workout,
        metrics: {
            durationSeconds:
                workout.metrics.durationSeconds ??
                rangeMetrics?.durationSeconds ??
                null,
            activeKcal:
                workout.metrics.activeKcal ?? rangeMetrics?.activeKcal ?? null,
            totalKcal:
                rangeMetrics?.totalKcal ?? workout.metrics.totalKcal ?? null,
            avgHr: rangeMetrics?.avgHr ?? workout.metrics.avgHr ?? null,
            maxHr: rangeMetrics?.maxHr ?? workout.metrics.maxHr ?? null,

            /**
             * Gym Check intentionally imports only strength-session metrics.
             * Distance, steps, elevation, pace, and cadence remain reserved for
             * the Cardio workflow so daily aggregate samples cannot leak into a
             * gym session.
             */
            distanceKm: null,
            steps: null,
            elevationGainM: null,
            paceSecPerKm: null,
            cadenceRpm: null,

            /**
             * Workout effort remains manual until the provider exposes a stable,
             * documented effort field through the current workout query.
             */
            effortRpe: null,
        },
    };
}

async function enrichGymCheckWorkout(
    workout: HealthImportedWorkoutSessionMinimal
): Promise<HealthImportedWorkoutSessionMinimal> {
    if (!workout.startAt || !workout.endAt) {
        return mergeGymCheckMetrics(workout, null);
    }

    try {
        const rangeMetrics = await readHealthMetricsByRange({
            from: workout.startAt,
            to: workout.endAt,
        });

        return mergeGymCheckMetrics(workout, rangeMetrics);
    } catch {
        return mergeGymCheckMetrics(workout, null);
    }
}

async function logGymCheckWorkoutSelection(args: {
    date: ISODate;
    provider: HealthProvider | null;
    workouts: HealthImportedWorkoutSessionMinimal[];
    matchingWorkouts: HealthImportedWorkoutSessionMinimal[];
    selected: HealthImportedWorkoutSessionMinimal | null;
}): Promise<void> {
    if (!args.provider) {
        return;
    }

    const meaningfulMatchingCount = args.matchingWorkouts.filter((workout) =>
        hasMeaningfulImportedWorkoutMetrics(workout.metrics)
    ).length;

    const outcome =
        args.workouts.length === 0
            ? "no-samples"
            : args.matchingWorkouts.length === 0
                ? "no-matching-workout"
                : args.selected
                    ? "selected"
                    : "no-meaningful-workout";

    await appendHealthDiagnosticEvent({
        id: createHealthDiagnosticId("workout-selection"),
        createdAt: new Date().toISOString(),
        provider: args.provider,
        level: args.selected ? "info" : "warning",
        kind: "workout-selection",
        targetDate: args.date,
        candidateCount: args.workouts.length,
        matchingCandidateCount: args.matchingWorkouts.length,
        meaningfulCandidateCount: meaningfulMatchingCount,
        requiredProviderWorkoutType: GYM_CHECK_PROVIDER_WORKOUT_TYPE,
        selectedExternalId: args.selected?.externalId ?? null,
        selectedType:
            args.selected?.providerWorkoutType ?? args.selected?.type ?? null,
        selectedSample: args.selected
            ? toHealthWorkoutDiagnosticSample(args.selected)
            : null,
        outcome,
    });
}

export async function isHealthAvailable(): Promise<boolean> {
    if (isIOS()) {
        return isHealthIOSAvailable();
    }

    if (isAndroid()) {
        return isHealthAndroidAvailable();
    }

    return false;
}

export async function getHealthProvider(): Promise<HealthProvider | null> {
    return getCurrentProvider();
}

/**
 * Unique platform facade:
 * - detects platform
 * - delegates to iOS or Android implementation
 */
export async function requestHealthPermissions(
    input: HealthPermissionsRequest
): Promise<HealthPermissionsStatus> {
    if (isIOS()) {
        return requestHealthIOSPermissions(input);
    }

    if (isAndroid()) {
        return requestHealthAndroidPermissions(input);
    }

    return buildUnavailablePermissionsStatus();
}

export async function readHealthSleepByDate(
    input: HealthReadSleepInput
): Promise<HealthImportedSleep | null> {
    if (isIOS()) {
        return readHealthIOSSleepByDate(input);
    }

    if (isAndroid()) {
        return readHealthAndroidSleepByDate(input);
    }

    return null;
}

export async function readHealthWorkoutsByDate(
    input: HealthReadWorkoutsInput
): Promise<HealthImportedWorkoutSessionMinimal[]> {
    if (isIOS()) {
        return readHealthIOSWorkoutsByDate(input);
    }

    if (isAndroid()) {
        return readHealthAndroidWorkoutsByDate(input);
    }

    return [];
}

export async function readHealthMetricsByRange(
    input: HealthReadMetricsRangeInput
): Promise<HealthImportedWorkoutMetrics | null> {
    if (isIOS()) {
        return readHealthIOSMetricsByRange(input);
    }

    if (isAndroid()) {
        return readHealthAndroidMetricsByRange(input);
    }

    return null;
}

/**
 * Reads all provider workouts for diagnostics, then selects and enriches only
 * Traditional Strength Training for Gym Check. Cardio remains free to consume
 * the generic workout reader without this filter.
 */
export async function readHealthGymCheckWorkoutByDate(
    input: HealthReadWorkoutsInput
): Promise<HealthGymCheckWorkoutReadResult> {
    const provider = getCurrentProvider();
    const workouts = await readHealthWorkoutsByDate(input);
    const matchingWorkouts = getGymCheckHealthWorkoutCandidates(workouts);
    const baseSelected = selectGymCheckHealthWorkout(matchingWorkouts);
    const selected = baseSelected
        ? await enrichGymCheckWorkout(baseSelected)
        : null;

    await logGymCheckWorkoutSelection({
        date: input.date,
        provider,
        workouts,
        matchingWorkouts,
        selected,
    });

    return {
        provider,
        targetWorkoutType: GYM_CHECK_PROVIDER_WORKOUT_TYPE,
        workouts,
        matchingWorkouts,
        selected,
    };
}

/**
 * Convenience helper for day bootstrap:
 * returns both sleep and imported workouts for the same date.
 */
export async function readHealthDayBundleByDate(input: {
    date: ISODate;
}): Promise<{
    provider: HealthProvider | null;
    sleep: HealthImportedSleep | null;
    workouts: HealthImportedWorkoutSessionMinimal[];
}> {
    const provider = getCurrentProvider();

    const [sleep, workouts] = await Promise.all([
        readHealthSleepByDate({ date: input.date }),
        readHealthWorkoutsByDate({ date: input.date }),
    ]);

    return {
        provider,
        sleep,
        workouts,
    };
}

/**
 * Useful strict helper when a caller explicitly expects native mobile only.
 */
export function assertHealthSupportedPlatform(): void {
    if (isIOS() || isAndroid()) return;
    throwUnsupportedPlatform();
}
