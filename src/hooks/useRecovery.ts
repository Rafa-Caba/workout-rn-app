// /src/hooks/useRecovery.ts
import type { ApiAxiosError } from "@/src/services/http.client";
import type { RecoveryResponse } from "@/src/services/workout/insights.service";
import { getRecovery } from "@/src/services/workout/insights.service";
import { useQuery } from "@tanstack/react-query";

export function useRecovery(args: { from?: string; to?: string }, enabled: boolean) {
    return useQuery<RecoveryResponse, ApiAxiosError>({
        queryKey: ["recovery", args.from ?? null, args.to ?? null],
        queryFn: () => getRecovery(args),
        enabled,
        staleTime: 30_000,
    });
}