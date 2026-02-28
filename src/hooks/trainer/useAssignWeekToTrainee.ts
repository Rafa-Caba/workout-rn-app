import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiAxiosError } from "@/src/services/http.client";
import { assignWeekToTrainee } from "@/src/services/workout/trainer.service";
import type { WeeklyAssignBody, WeeklyAssignResponse } from "@/src/types/trainer.types";
import type { WeekKey } from "@/src/types/workoutDay.types";

export function useAssignWeekToTrainee() {
    const qc = useQueryClient();

    return useMutation<
        WeeklyAssignResponse,
        ApiAxiosError,
        { traineeId: string; weekKey: WeekKey; body: WeeklyAssignBody }
    >({
        mutationFn: ({ traineeId, weekKey, body }) => assignWeekToTrainee(traineeId, weekKey, body),
        onSuccess: (_data, vars) => {
            // Invalidate week summary and any related views.
            qc.invalidateQueries({ queryKey: ["trainer", "weekSummary", vars.traineeId, vars.weekKey] });
            qc.invalidateQueries({ queryKey: ["trainer", "recovery", vars.traineeId] });
            qc.invalidateQueries({ queryKey: ["trainer", "day", vars.traineeId] });
        },
    });
}