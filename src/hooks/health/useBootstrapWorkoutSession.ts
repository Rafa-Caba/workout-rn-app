// src/hooks/health/useBootstrapWorkoutSession.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { readHealthWorkoutsByDate } from "@/src/services/health/health.service";
import {
    ensureWorkoutDayExistsDays,
    getWorkoutDayServ,
    saveMinimalImportedSessionForDay,
    upsertWorkoutDay,
} from "@/src/services/workout/days.service";
import type { HealthImportedWorkoutSessionMinimal } from "@/src/types/health/health.types";
import type {
    WorkoutDay,
    WorkoutSession,
    WorkoutSessionMeta,
    WorkoutSessionUpsert,
} from "@/src/types/workoutDay.types";
import {
    hasMeaningfulImportedWorkoutMetrics,
    mapImportedWorkoutToGymCheckMetricsPatch,
} from "@/src/utils/health/healthWorkout.mapper";

type BootstrapWorkoutSessionArgs = {
    date: string;
};

type BootstrapWorkoutSessionResult = {
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

function pickImportedWorkoutForPatch(
    sessions: HealthImportedWorkoutSessionMinimal[]
): HealthImportedWorkoutSessionMinimal | null {
    const meaningful = sessions.filter((session) =>
        hasMeaningfulImportedWorkoutMetrics(session.metrics)
    );

    return meaningful[0] ?? null;
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

    return {
        id: current.id,
        type: current.type,

        startAt: patch.startAt ?? current.startAt ?? null,
        endAt: patch.endAt ?? current.endAt ?? null,

        durationSeconds: patch.durationSeconds ?? current.durationSeconds ?? null,

        activeKcal: patch.activeKcal ?? current.activeKcal ?? null,
        totalKcal: patch.totalKcal ?? current.totalKcal ?? null,

        avgHr: patch.avgHr ?? current.avgHr ?? null,
        maxHr: patch.maxHr ?? current.maxHr ?? null,

        distanceKm: patch.distanceKm ?? current.distanceKm ?? null,
        steps: patch.steps ?? current.steps ?? null,
        elevationGainM: patch.elevationGainM ?? current.elevationGainM ?? null,

        paceSecPerKm: patch.paceSecPerKm ?? current.paceSecPerKm ?? null,
        cadenceRpm: patch.cadenceRpm ?? current.cadenceRpm ?? null,

        /**
         * GymCheck remains manual for effortRpe.
         */
        effortRpe: current.effortRpe ?? null,
        notes: current.notes ?? null,
        media: current.media ?? null,
        exercises: current.exercises ?? null,

        meta: mergeSessionMeta(current.meta ?? null, patch.meta ?? null),
    };
}

export function useBootstrapWorkoutSession() {
    const qc = useQueryClient();

    return useMutation<BootstrapWorkoutSessionResult, Error, BootstrapWorkoutSessionArgs>({
        mutationFn: async ({ date }) => {
            await ensureWorkoutDayExistsDays(date);

            const importedSessions = await readHealthWorkoutsByDate({ date });
            const meaningfulImportedSessions = importedSessions.filter((session) =>
                hasMeaningfulImportedWorkoutMetrics(session.metrics)
            );

            if (!meaningfulImportedSessions.length) {
                const day = await getWorkoutDayServ(date);
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
                const importedForPatch = pickImportedWorkoutForPatch(meaningfulImportedSessions);

                if (!importedForPatch) {
                    return {
                        day: currentDay,
                        mode: "noop",
                    };
                }

                const nextSessions: WorkoutSessionUpsert[] = currentSessions.map((session) =>
                    session.id === patchableSession.id
                        ? mergeMetricsIntoExistingSession(session, importedForPatch)
                        : toSessionUpsert(session)
                );

                const day = await upsertWorkoutDay(
                    date,
                    {
                        training: {
                            source: currentDay.training?.source ?? importedForPatch.source ?? null,
                            dayEffortRpe: currentDay.training?.dayEffortRpe ?? null,
                            raw: currentDay.training?.raw ?? null,
                            sessions: nextSessions,
                        },
                    },
                    "merge"
                );

                return {
                    day,
                    mode: "patched-existing-session",
                };
            }

            let latestDay: WorkoutDay | null = currentDay;

            for (const importedSession of meaningfulImportedSessions) {
                latestDay = await saveMinimalImportedSessionForDay(date, importedSession, "merge");
            }

            return {
                day: latestDay,
                mode: "created-minimal-session",
            };
        },
        onSuccess: (result, vars) => {
            if (!result.day) {
                return;
            }

            qc.setQueryData(["workoutDay", vars.date], result.day);
        },
    });
}