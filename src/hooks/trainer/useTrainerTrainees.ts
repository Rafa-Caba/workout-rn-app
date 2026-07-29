// /src/hooks/trainer/useTrainerTrainees.ts

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/src/query/queryKeys";

import type { ApiAxiosError } from "@/src/services/http.client";
import { listTrainees } from "@/src/services/workout/trainer.service";
import type { PublicUser } from "@/src/types/auth.types";

export function useTrainerTrainees() {
    return useQuery<PublicUser[], ApiAxiosError>({
        queryKey: queryKeys.trainer.trainees,
        queryFn: () => listTrainees(),
        staleTime: 30_000,
    });
}