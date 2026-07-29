// /src/hooks/health/useBootstrapWorkoutSession.ts
// Imports one eligible strength workout into an existing or minimal Gym Check session.

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { invalidateWorkoutDayRelatedQueries } from "@/src/query/invalidateWorkoutDayQueries";
import { queryKeys } from "@/src/query/queryKeys";

import {
    appendHealthDiagnosticEvent,
    createHealthDiagnosticId,
} from "@/src/services/health/diagnostics/healthDiagnostics.service";
import { readHealthGymCheckWorkoutByDate } from "@/src/services/health/health.service";
import {
    ensureWorkoutDayExistsDays,
    getWorkoutDayServ,
    saveMinimalImportedSessionForDay,
    upsertWorkoutDay,
} from "@/src/services/workout/days.service";
import type {
    HealthImportedWorkoutSessionMinimal,
    HealthProvider,
} from "@/src/types/health/cardio/health.types";
import type {
    WorkoutDay,
    WorkoutSession,
    WorkoutSessionMeta,
    WorkoutSessionUpsert,
} from "@/src/types/workoutDay.types";
import { mapImportedWorkoutToGymCheckMetricsPatch } from "@/src/utils/health/healthWorkout.mapper";

type BootstrapWorkoutSessionArgs = {
    date: string;
};

export type BootstrapWorkoutSessionResult = {
    day: WorkoutDay | null;
    mode: "patched-existing-session" | "created-minimal-session" | "noop";
};

function isPatchableGymCheckSession(session: WorkoutSession): boolean {
    const sessionKey =
        typeof session.meta?.sessionKey === "string"
            ? session.meta.sessionKey
            : null;

    const sessionKind =
        typeof session.meta?.sessionKind === "string"
            ? session.meta.sessionKind
            : null;

    return sessionKey === "gym_check" || sessionKind === "gym-check";
}

function mergeSessionMeta(
    currentMeta: WorkoutSessionMeta | null,
    patchMeta: WorkoutSessionMeta | null
): WorkoutSessionMeta | null {
    if (!currentMeta && !patchMeta) {
        return null;
    }

    return {
        ...(currentMeta ?? {}),
        ...(patchMeta ?? {}),
    };
}

function toSessionUpsert(session: WorkoutSession): WorkoutSessionUpsert {
    return {
        id: session.id,
        type: session.type,
        activityType: session.activityType ?? null,
        cardioEnvironment: session.cardioEnvironment ?? null,
        startAt: session.startAt ?? null,
        endAt: session.endAt ?? null,
        durationSeconds: session.durationSeconds ?? null,
        activeKcal: session.activeKcal ?? null,
        totalKcal: session.totalKcal ?? null,
        avgHr: session.avgHr ?? null,
        maxHr: session.maxHr ?? null,
        distanceKm: session.distanceKm ?? null,
        steps: session.steps ?? null,
        elevationGainM: session.elevationGainM ?? null,
        paceSecPerKm: session.paceSecPerKm ?? null,
        cadenceRpm: session.cadenceRpm ?? null,
        hasRoute: session.hasRoute ?? false,
        cardioMetrics: session.cardioMetrics ?? null,
        routeSummary: session.routeSummary ?? null,
        routePoints: session.routePoints ?? null,
        effortRpe: session.effortRpe ?? null,
        notes: session.notes ?? null,
        media: session.media ?? null,
        exercises: session.exercises ?? null,
        meta: session.meta ?? null,
    };
}

function mergeMetricsIntoExistingSession(
    current: WorkoutSession,
    imported: HealthImportedWorkoutSessionMinimal
): WorkoutSessionUpsert {
    const patch = mapImportedWorkoutToGymCheckMetricsPatch(imported);
    const hasImportedTotal =
        typeof patch.totalKcal === "number" && Number.isFinite(patch.totalKcal);
    const mergedMeta = mergeSessionMeta(current.meta ?? null, patch.meta ?? null);
    const meta = mergedMeta
        ? {
            ...mergedMeta,
            totalKcalEstimated: hasImportedTotal
                ? patch.meta?.totalKcalEstimated === true
                : current.meta?.totalKcalEstimated ?? null,
        }
        : null;

    return {
        id: current.id,
        type: current.type,
        activityType: null,
        cardioEnvironment: null,

        startAt: patch.startAt ?? current.startAt ?? null,
        endAt: patch.endAt ?? current.endAt ?? null,

        durationSeconds: patch.durationSeconds ?? current.durationSeconds ?? null,

        activeKcal: patch.activeKcal ?? current.activeKcal ?? null,
        totalKcal: patch.totalKcal ?? current.totalKcal ?? null,

        avgHr: patch.avgHr ?? current.avgHr ?? null,
        maxHr: patch.maxHr ?? current.maxHr ?? null,

        /**
         * Gym Check is strength-only. Explicitly clear legacy cardio values so
         * they cannot survive a re-sync from an older app version.
         */
        distanceKm: null,
        steps: null,
        elevationGainM: null,
        paceSecPerKm: null,
        cadenceRpm: null,
        hasRoute: false,
        cardioMetrics: null,
        routeSummary: null,
        routePoints: null,

        /**
         * Gym Check keeps effortRpe manual until the provider exposes a stable,
         * documented workout-effort field in the imported sample.
         */
        effortRpe: current.effortRpe ?? null,
        notes: current.notes ?? null,
        media: current.media ?? null,
        exercises: current.exercises ?? null,

        meta,
    };
}

async function logWorkoutPersistence(args: {
    date: string;
    provider: HealthProvider;
    mode: BootstrapWorkoutSessionResult["mode"];
    selectedExternalId: string | null;
    errorMessage?: string | null;
}): Promise<void> {
    await appendHealthDiagnosticEvent({
        id: createHealthDiagnosticId("workout-persistence"),
        createdAt: new Date().toISOString(),
        provider: args.provider,
        level: args.errorMessage ? "error" : args.mode === "noop" ? "warning" : "info",
        kind: "workout-persistence",
        targetDate: args.date,
        saved: args.mode !== "noop" && !args.errorMessage,
        mode: args.mode,
        selectedExternalId: args.selectedExternalId,
        errorMessage: args.errorMessage ?? null,
    });
}

export function useBootstrapWorkoutSession() {
    const qc = useQueryClient();

    return useMutation<BootstrapWorkoutSessionResult, Error, BootstrapWorkoutSessionArgs>({
        mutationFn: async ({ date }) => {
            await ensureWorkoutDayExistsDays(date);

            const importResult = await readHealthGymCheckWorkoutByDate({ date });
            const importedSession = importResult.selected;

            if (!importedSession) {
                const day = await getWorkoutDayServ(date);
                await logWorkoutPersistence({
                    date,
                    provider: importResult.provider ?? "healthkit",
                    mode: "noop",
                    selectedExternalId: null,
                });
                return {
                    day,
                    mode: "noop",
                };
            }

            const currentDay = await getWorkoutDayServ(date);
            const currentSessions = Array.isArray(currentDay.training?.sessions)
                ? currentDay.training.sessions
                : [];

            const patchableSession =
                currentSessions.find((session) => isPatchableGymCheckSession(session)) ??
                null;

            if (patchableSession) {
                const nextSessions: WorkoutSessionUpsert[] = currentSessions.map((session) =>
                    session.id === patchableSession.id
                        ? mergeMetricsIntoExistingSession(session, importedSession)
                        : toSessionUpsert(session)
                );

                const day = await upsertWorkoutDay(
                    date,
                    {
                        training: {
                            source: currentDay.training?.source ?? importedSession.source ?? null,
                            dayEffortRpe: currentDay.training?.dayEffortRpe ?? null,
                            raw: currentDay.training?.raw ?? null,
                            sessions: nextSessions,
                        },
                    },
                    "merge"
                );

                await logWorkoutPersistence({
                    date,
                    provider: importResult.provider ?? "healthkit",
                    mode: "patched-existing-session",
                    selectedExternalId: importedSession.externalId ?? null,
                });
                return {
                    day,
                    mode: "patched-existing-session",
                };
            }

            const day = await saveMinimalImportedSessionForDay(
                date,
                importedSession,
                "merge"
            );

            await logWorkoutPersistence({
                date,
                provider: importResult.provider ?? "healthkit",
                mode: "created-minimal-session",
                selectedExternalId: importedSession.externalId ?? null,
            });
            return {
                day,
                mode: "created-minimal-session",
            };
        },
        onSuccess: async (result, variables) => {
            if (!result.day) return;

            qc.setQueryData(queryKeys.workout.day(variables.date), result.day);
            await invalidateWorkoutDayRelatedQueries(qc, { date: variables.date });
        },
        onError: async (error, variables) => {
            await logWorkoutPersistence({
                date: variables.date,
                provider: "healthkit",
                mode: "noop",
                selectedExternalId: null,
                errorMessage: error.message,
            });
        },
    });
}
