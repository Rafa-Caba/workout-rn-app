// /src/hooks/trainer/usePatchTraineePlannedRoutine.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/src/query/queryKeys";

import type { ApiAxiosError } from "@/src/services/http.client";
import { patchTraineePlannedRoutine } from "@/src/services/workout/trainer.service";
import type { PatchPlannedRoutineBody, PatchPlannedRoutineResponse } from "@/src/types/trainer.types";
import type { ISODate, WeekKey } from "@/src/types/workoutDay.types";

export function usePatchTraineePlannedRoutine() {
    const qc = useQueryClient();

    return useMutation<
        PatchPlannedRoutineResponse,
        ApiAxiosError,
        { traineeId: string; date: ISODate; body: PatchPlannedRoutineBody; weekKey?: WeekKey }
    >({
        mutationFn: ({ traineeId, date, body }) => patchTraineePlannedRoutine(traineeId, date, body),
        onSuccess: (_data, vars) => {
            // Refresh day + recovery; week summary may also change depending on BE rollups.
            qc.invalidateQueries({ queryKey: queryKeys.trainer.traineeDay(vars.traineeId, vars.date) });
            qc.invalidateQueries({ queryKey: queryKeys.trainer.recoveryRoot(vars.traineeId) });

            // The weekly rollup can change regardless of whether the caller already knows its week key.
            qc.invalidateQueries({ queryKey: queryKeys.trainer.traineeWeekRoot(vars.traineeId) });
        },
    });
}