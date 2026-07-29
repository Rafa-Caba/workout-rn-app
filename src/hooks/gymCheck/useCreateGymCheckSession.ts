// /src/hooks/gymCheck/useCreateGymCheckSession.ts
// Creates or updates a Gym Check session and refreshes all dependent caches.

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { invalidateWorkoutDayRelatedQueries } from "@/src/query/invalidateWorkoutDayQueries";
import { queryKeys } from "@/src/query/queryKeys";
import type { ApiAxiosError } from "@/src/services/http.client";
import {
    attachSessionMedia,
    upsertGymCheckSession,
    type AttachMediaItem,
    type CreateSessionBody,
    type SessionReturnMode,
} from "@/src/services/workout/sessions.service";

export function useCreateGymCheckSession() {
    const queryClient = useQueryClient();

    return useMutation<
        { mode: "created" | "patched"; sessionId: string; data: unknown },
        ApiAxiosError,
        {
            date: string;
            payload: CreateSessionBody;
            attachMediaItems?: AttachMediaItem[];
            weekKey: string;
        }
    >({
        mutationFn: async ({ date, payload, attachMediaItems }) => {
            const items = attachMediaItems ?? [];
            const needsAttachment = items.length > 0;
            const returnMode: SessionReturnMode = needsAttachment ? "session" : "day";
            const upserted = await upsertGymCheckSession(date, payload, { returnMode });

            if (needsAttachment) {
                await attachSessionMedia(
                    date,
                    upserted.sessionId,
                    { items },
                    { returnMode: "day" },
                );
            }

            return {
                mode: upserted.mode,
                sessionId: upserted.sessionId,
                data: upserted.data,
            };
        },
        onSuccess: async (_data, variables) => {
            await Promise.allSettled([
                invalidateWorkoutDayRelatedQueries(queryClient, {
                    date: variables.date,
                    weekKey: variables.weekKey,
                }),
                queryClient.invalidateQueries({
                    queryKey: queryKeys.routines.week(variables.weekKey),
                }),
            ]);
        },
    });
}
