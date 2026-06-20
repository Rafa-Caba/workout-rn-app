// src/hooks/health/useBackfillSingleDate.ts
// Hook para importar un solo día desde HealthKit / Health Connect.
// Mantiene el contrato original: WorkoutDay | null.
// Solo normaliza errores para que la UI no muestre mensajes crudos de Axios.

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { readHealthDayBundleByDate } from "@/src/services/health/health.service";
import { backfillWorkoutDayByDate } from "@/src/services/workout/days.service";
import type { WorkoutDay, WorkoutDayUpsertBody } from "@/src/types/workoutDay.types";
import { normalizeApiError } from "@/src/utils/api/apiErrorMessage";
import {
    hasMeaningfulImportedSleep,
    mapImportedSleepToSleepBlock,
} from "@/src/utils/health/healthSleep.mapper";
import {
    hasMeaningfulImportedWorkoutMetrics,
    mapImportedWorkoutToMinimalDaySession,
} from "@/src/utils/health/healthWorkout.mapper";

type BackfillSingleDateArgs = {
    date: string;
    mode?: "merge" | "replace";
};

type ImportedSleepBlock = ReturnType<typeof mapImportedSleepToSleepBlock>;
type ImportedWorkoutSession = ReturnType<typeof mapImportedWorkoutToMinimalDaySession>;

function buildBackfillPayload(input: {
    sleep: ImportedSleepBlock | null;
    sessions: ImportedWorkoutSession[];
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

function createHumanBackfillError(error: unknown): Error {
    const normalized = normalizeApiError(error);

    return new Error(normalized.message);
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

            try {
                return await backfillWorkoutDayByDate(date, payload, mode);
            } catch (error: unknown) {
                throw createHumanBackfillError(error);
            }
        },
        onSuccess: (day, vars) => {
            if (!day) {
                return;
            }

            qc.setQueryData(["workoutDay", vars.date], day);
        },
    });
}