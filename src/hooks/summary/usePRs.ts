import { useQuery } from "@tanstack/react-query";

import type { ApiAxiosError } from "@/src/services/http.client";
import { getPRs, type PrsResponse } from "@/src/services/workout/insights.service";

export function usePRs(args: { from?: string; to?: string }, enabled: boolean) {
    const from = args.from ?? "";
    const to = args.to ?? "";

    return useQuery<PrsResponse, ApiAxiosError>({
        queryKey: ["prs", from, to],
        queryFn: () => getPRs({ from: from || undefined, to: to || undefined }),
        enabled: enabled && Boolean(from) && Boolean(to),
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
    });
}