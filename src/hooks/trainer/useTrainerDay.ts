// /src/hooks/trainer/useTrainerDay.ts

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/src/query/queryKeys";

import type { ApiAxiosError } from "@/src/services/http.client";
import { getTraineeDay } from "@/src/services/workout/trainer.service";
import type { GetTraineeDayResponse } from "@/src/types/trainer.types";
import type { ISODate } from "@/src/types/workoutDay.types";

export function useTrainerDay(args: { traineeId: string; date: ISODate }) {
    const enabled = Boolean(args?.traineeId) && Boolean(args?.date);

    return useQuery<GetTraineeDayResponse, ApiAxiosError>({
        queryKey: queryKeys.trainer.traineeDay(args.traineeId, args.date),
        queryFn: () => getTraineeDay(args.traineeId, args.date),
        enabled,
        staleTime: 15_000,
    });
}