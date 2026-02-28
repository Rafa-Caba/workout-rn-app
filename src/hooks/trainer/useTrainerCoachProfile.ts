import { useQuery } from "@tanstack/react-query";

import type { ApiAxiosError } from "@/src/services/http.client";
import { getTraineeCoachProfile } from "@/src/services/workout/trainer.service";
import type { GetTraineeCoachProfileResponse } from "@/src/types/trainerCoachProfile.types";

export function useTrainerCoachProfile(args: { traineeId: string }) {
    const enabled = Boolean(args?.traineeId);

    return useQuery<GetTraineeCoachProfileResponse, ApiAxiosError>({
        queryKey: ["trainer", "coachProfile", args.traineeId],
        queryFn: () => getTraineeCoachProfile(args.traineeId),
        enabled,
        staleTime: 30_000,
    });
}