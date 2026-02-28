import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiAxiosError } from "@/src/services/http.client";
import {
    attachSessionMedia,
    upsertGymCheckSession,
    type AttachMediaItem,
    type CreateSessionBody,
    type SessionReturnMode,
} from "@/src/services/workout/sessions.service";

export function useCreateGymCheckSession() {
    const qc = useQueryClient();

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
            const items = Array.isArray(attachMediaItems) ? attachMediaItems : [];
            const needAttach = items.length > 0;

            const returnMode: SessionReturnMode = needAttach ? "session" : "day";

            const upserted = await upsertGymCheckSession(date, payload, { returnMode });

            if (needAttach) {
                await attachSessionMedia(date, upserted.sessionId, { items }, { returnMode: "day" });
            }

            return {
                mode: upserted.mode,
                sessionId: upserted.sessionId,
                data: upserted.data,
            };
        },
        onSuccess: async (_data, vars) => {
            await Promise.allSettled([
                qc.invalidateQueries({ queryKey: ["workoutDay", vars.date] }),
                qc.invalidateQueries({ queryKey: ["daySummary", vars.date] }),
                qc.invalidateQueries({ queryKey: ["routineWeek", vars.weekKey] }),
            ]);
        },
    });
}