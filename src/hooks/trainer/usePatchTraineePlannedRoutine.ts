import { useMutation, useQueryClient } from "@tanstack/react-query";

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
            qc.invalidateQueries({ queryKey: ["trainer", "day", vars.traineeId, vars.date] });
            qc.invalidateQueries({ queryKey: ["trainer", "recovery", vars.traineeId] });

            if (vars.weekKey) {
                qc.invalidateQueries({ queryKey: ["trainer", "weekSummary", vars.traineeId, vars.weekKey] });
            } else {
                qc.invalidateQueries({ queryKey: ["trainer", "weekSummary", vars.traineeId] });
            }
        },
    });
}