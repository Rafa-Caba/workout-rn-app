import { useQuery } from "@tanstack/react-query";

import type { ApiAxiosError } from "@/src/services/http.client";
import { listTrainees } from "@/src/services/workout/trainer.service";
import type { PublicUser } from "@/src/types/auth.types";

export function useTrainerTrainees() {
    return useQuery<PublicUser[], ApiAxiosError>({
        queryKey: ["trainer", "trainees"],
        queryFn: () => listTrainees(),
        staleTime: 30_000,
    });
}