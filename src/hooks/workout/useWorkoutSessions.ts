// /src/hooks/workout/useWorkoutSessions.ts
// Typed session mutations with shared cache invalidation.

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { invalidateWorkoutDayRelatedQueries } from "@/src/query/invalidateWorkoutDayQueries";
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

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractSessionIdFromCreateResponse(data: unknown): string | null {
    if (!isRecord(data) || !isRecord(data.session)) return null;
    const id = data.session.id;
    return typeof id === "string" && id.trim() ? id.trim() : null;
}

class SessionMutationError extends Error {
    readonly status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = "SessionMutationError";
        this.status = status;
    }
}

function throwWithStatus(message: string, status: number): never {
    throw new SessionMutationError(message, status);
}

export function useCreateWorkoutSession(args: {
    date: string;
    weekKey?: string;
    returnMode?: SessionReturnMode;

    /** Existing media items that must be attached after session creation. */
    attachMediaItems?: AttachMediaItem[];
}) {
    const queryClient = useQueryClient();

    return useMutation<unknown, ApiAxiosError, CreateSessionBody>({
        mutationFn: async (payload) => {
            await ensureWorkoutDayExists(args.date);

            const attachMediaItems = args.attachMediaItems ?? [];
            const hasAttachments = attachMediaItems.length > 0;
            const createReturnMode: SessionReturnMode = hasAttachments
                ? "session"
                : args.returnMode ?? "day";

            const created = await createSession(args.date, payload, {
                returnMode: createReturnMode,
            });

            if (!hasAttachments) return created;

            const sessionId = extractSessionIdFromCreateResponse(created);
            if (!sessionId) {
                throwWithStatus(
                    "Session created but response did not include session.id (cannot attach media).",
                    500,
                );
            }

            return attachSessionMedia(
                args.date,
                sessionId,
                { items: attachMediaItems },
                { returnMode: args.returnMode ?? "day" },
            );
        },
        onSuccess: async () => {
            await invalidateWorkoutDayRelatedQueries(queryClient, {
                date: args.date,
                weekKey: args.weekKey,
            });
        },
    });
}

export function usePatchWorkoutSession(args: {
    date: string;
    sessionId: string;
    weekKey?: string;
    returnMode?: SessionReturnMode;
}) {
    const queryClient = useQueryClient();

    return useMutation<unknown, ApiAxiosError, PatchSessionBody>({
        mutationFn: (payload) =>
            patchSession(args.date, args.sessionId, payload, {
                returnMode: args.returnMode ?? "day",
            }),
        onSuccess: async () => {
            await invalidateWorkoutDayRelatedQueries(queryClient, {
                date: args.date,
                weekKey: args.weekKey,
            });
        },
    });
}

export function useDeleteWorkoutSession(args: {
    date: string;
    sessionId: string;
    weekKey?: string;
    returnMode?: SessionReturnMode;
}) {
    const queryClient = useQueryClient();

    return useMutation<unknown, ApiAxiosError, { deleteMedia?: boolean } | undefined>({
        mutationFn: (payload) =>
            deleteSession(args.date, args.sessionId, {
                returnMode: args.returnMode ?? "day",
                deleteMedia: payload?.deleteMedia,
            }),
        onSuccess: async () => {
            await invalidateWorkoutDayRelatedQueries(queryClient, {
                date: args.date,
                weekKey: args.weekKey,
            });
        },
    });
}
