// /src/hooks/trainer/useUpsertTrainerCoachProfile.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/src/query/queryKeys";

import type { ApiAxiosError } from "@/src/services/http.client";
import { upsertTraineeCoachProfile } from "@/src/services/workout/trainer.service";
import type {
    UpsertTraineeCoachProfileBody,
    UpsertTraineeCoachProfileResponse,
} from "@/src/types/trainerCoachProfile.types";

export function useUpsertTrainerCoachProfile() {
    const qc = useQueryClient();

    return useMutation<
        UpsertTraineeCoachProfileResponse,
        ApiAxiosError,
        { traineeId: string; body: UpsertTraineeCoachProfileBody }
    >({
        mutationFn: ({ traineeId, body }) => upsertTraineeCoachProfile(traineeId, body),
        onSuccess: (_data, vars) => {
            qc.invalidateQueries({ queryKey: queryKeys.trainer.coachProfile(vars.traineeId) });
        },
    });
}