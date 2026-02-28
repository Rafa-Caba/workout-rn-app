import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiAxiosError } from "@/src/services/http.client";
import {
    attachSessionMedia,
    createSession,
    deleteSession,
    ensureWorkoutDayExists,
    patchSession,
    type AttachMediaItem,
    type CreateSessionBody,
    type PatchSessionBody,
    type SessionReturnMode,
} from "@/src/services/workout/sessions.service";

type CreatedSessionResponse = {
    session?: { id?: string } | null;
};

const extractSessionIdFromCreateResponse = (data: unknown): string | null => {
    if (!data || typeof data !== "object") return null;

    const maybe = data as CreatedSessionResponse;
    const id = maybe?.session?.id;
    if (typeof id === "string" && id.trim()) return id.trim();

    return null;
};

function throwWithStatus(message: string, status: number): never {
    const err: any = new Error(message);
    err.status = status;
    throw err;
}

export function useCreateWorkoutSession(args: {
    date: string;
    weekKey?: string;
    returnMode?: SessionReturnMode;

    /**
     * Option B:
     * If provided, we will:
     * 1) create session with returnMode="session" (to get sessionId)
     * 2) POST /media/attach with these items
     */
    attachMediaItems?: AttachMediaItem[];
}) {
    const qc = useQueryClient();

    return useMutation<unknown, ApiAxiosError, CreateSessionBody>({
        mutationFn: async (payload) => {
            await ensureWorkoutDayExists(args.date);

            const hasAttach = Array.isArray(args.attachMediaItems) && args.attachMediaItems.length > 0;

            // Force session return mode if we need to attach, so we can reliably read sessionId
            const createReturnMode: SessionReturnMode = hasAttach ? "session" : (args.returnMode ?? "day");

            const created = await createSession(args.date, payload, { returnMode: createReturnMode });

            if (!hasAttach) return created;

            const sessionId = extractSessionIdFromCreateResponse(created);
            if (!sessionId) {
                // Fail fast: attaching without a sessionId would silently break the flow.
                throwWithStatus(
                    "Session created but response did not include session.id (cannot attach media).",
                    500
                );
            }

            // Attach existing media into Day session media[]
            const attachRes = await attachSessionMedia(
                args.date,
                sessionId,
                { items: args.attachMediaItems as AttachMediaItem[] },
                { returnMode: args.returnMode ?? "day" }
            );

            return attachRes;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["workoutDay", args.date] });
            if (args.weekKey) qc.invalidateQueries({ queryKey: ["planVsActual", args.weekKey] });
        },
    });
}

export function usePatchWorkoutSession(args: {
    date: string;
    sessionId: string;
    weekKey?: string;
    returnMode?: SessionReturnMode;
}) {
    const qc = useQueryClient();

    return useMutation<unknown, ApiAxiosError, PatchSessionBody>({
        mutationFn: (payload) =>
            patchSession(args.date, args.sessionId, payload, { returnMode: args.returnMode ?? "day" }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["workoutDay", args.date] });
            if (args.weekKey) qc.invalidateQueries({ queryKey: ["planVsActual", args.weekKey] });
        },
    });
}

export function useDeleteWorkoutSession(args: {
    date: string;
    sessionId: string;
    weekKey?: string;
    returnMode?: SessionReturnMode;
}) {
    const qc = useQueryClient();

    return useMutation<unknown, ApiAxiosError, { deleteMedia?: boolean } | undefined>({
        mutationFn: (payload) =>
            deleteSession(args.date, args.sessionId, {
                returnMode: args.returnMode ?? "day",
                deleteMedia: payload?.deleteMedia,
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["workoutDay", args.date] });
            if (args.weekKey) qc.invalidateQueries({ queryKey: ["planVsActual", args.weekKey] });
        },
    });
}