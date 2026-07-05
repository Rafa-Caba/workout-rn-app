// src/hooks/health/useBackfillSingleDate.ts
// Hook para importar un solo día desde HealthKit / Health Connect.
// Usa el pipeline Cardio para walking/running, con dedupe contra sesiones
// existentes, manual-cardio y futuras app-live escritas al OS.

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { buildCardioBackfillPayloadForDate } from "@/src/services/health/cardio/cardioBackfill.service";
import { backfillWorkoutDayByDate } from "@/src/services/workout/days.service";
import type { WorkoutDay } from "@/src/types/workoutDay.types";
import { normalizeApiError } from "@/src/utils/api/apiErrorMessage";

type BackfillSingleDateArgs = {
    date: string;
    mode?: "merge" | "replace";
};

function createHumanBackfillError(error: unknown): Error {
    const normalized = normalizeApiError(error);

    return new Error(normalized.message);
}

export function useBackfillSingleDate() {
    const qc = useQueryClient();

    return useMutation<WorkoutDay | null, Error, BackfillSingleDateArgs>({
        mutationFn: async ({ date, mode = "merge" }) => {
            const result = await buildCardioBackfillPayloadForDate({ date, mode });

            if (!result.payload) {
                return null;
            }

            try {
                return await backfillWorkoutDayByDate(date, result.payload, mode);
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
