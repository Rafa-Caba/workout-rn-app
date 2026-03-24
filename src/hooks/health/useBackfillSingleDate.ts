// src/hooks/health/useBackfillSingleDate.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { readHealthDayBundleByDate } from "@/src/services/health/health.service";
import { backfillWorkoutDayByDate } from "@/src/services/workout/days.service";
import type { WorkoutDay, WorkoutDayUpsertBody } from "@/src/types/workoutDay.types";
import { hasMeaningfulImportedSleep, mapImportedSleepToSleepBlock } from "@/src/utils/health/healthSleep.mapper";
import {
    hasMeaningfulImportedWorkoutMetrics,
    mapImportedWorkoutToMinimalDaySession,
} from "@/src/utils/health/healthWorkout.mapper";

type BackfillSingleDateArgs = {
    date: string;
    mode?: "merge" | "replace";
};

function buildBackfillPayload(input: {
    sleep: ReturnType<typeof mapImportedSleepToSleepBlock> | null;
    sessions: ReturnType<typeof mapImportedWorkoutToMinimalDaySession>[];
}): WorkoutDayUpsertBody | null {
    const hasSleep = input.sleep !== null;
    const hasSessions = input.sessions.length > 0;

    if (!hasSleep && !hasSessions) {
        return null;
    }

    return {
        ...(hasSleep ? { sleep: input.sleep } : {}),
        ...(hasSessions
            ? {
                training: {
                    source: input.sessions[0]?.meta?.source ?? null,
                    dayEffortRpe: null,
                    raw: null,
                    sessions: input.sessions,
                },
            }
            : {}),
    };
}

export function useBackfillSingleDate() {
    const qc = useQueryClient();

    return useMutation<WorkoutDay | null, Error, BackfillSingleDateArgs>({
        mutationFn: async ({ date, mode = "merge" }) => {
            const bundle = await readHealthDayBundleByDate({ date });

            const mappedSleep =
                bundle.sleep && hasMeaningfulImportedSleep(bundle.sleep)
                    ? mapImportedSleepToSleepBlock(bundle.sleep)
                    : null;

            const mappedSessions = bundle.workouts
                .filter((session) => hasMeaningfulImportedWorkoutMetrics(session.metrics))
                .map((session) => mapImportedWorkoutToMinimalDaySession(session));

            const payload = buildBackfillPayload({
                sleep: mappedSleep,
                sessions: mappedSessions,
            });

            if (!payload) {
                return null;
            }

            return backfillWorkoutDayByDate(date, payload, mode);
        },
        onSuccess: (day, vars) => {
            if (!day) {
                return;
            }

            qc.setQueryData(["workoutDay", vars.date], day);
        },
    });
}