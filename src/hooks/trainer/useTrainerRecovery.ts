import { useQuery } from "@tanstack/react-query";

import type { ApiAxiosError } from "@/src/services/http.client";
import { getTraineeRecovery } from "@/src/services/workout/trainer.service";
import type { GetTraineeRecoveryResponse } from "@/src/types/trainer.types";
import type { ISODate } from "@/src/types/workoutDay.types";

export function useTrainerRecovery(args: { traineeId: string; from: ISODate; to: ISODate }) {
    const enabled = Boolean(args?.traineeId) && Boolean(args?.from) && Boolean(args?.to);

    return useQuery<GetTraineeRecoveryResponse, ApiAxiosError>({
        queryKey: ["trainer", "recovery", args.traineeId, args.from, args.to],
        queryFn: () => getTraineeRecovery(args.traineeId, args.from, args.to),
        enabled,
        staleTime: 30_000,
    });
}