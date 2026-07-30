// src/services/workout/sessions.service.ts

import { api } from "@/src/services/http.client";
import type {
    WorkoutActivityType,
    WorkoutCardioEnvironment,
    WorkoutCardioMetrics,
    WorkoutDay,
    WorkoutExercise,
    WorkoutRoutePoint,
    WorkoutRouteSummary,
    WorkoutSession,
} from "@/src/types/workoutDay.types";
import { mergeGymCheckSessionMeta } from "@/src/utils/gymCheck/sessionMeta";

export type SessionReturnMode = "day" | "session";

export type CreateSessionExerciseInput = Omit<WorkoutExercise, "id">;

export type CreateSessionBody = {
    type: string;

    activityType?: WorkoutActivityType;
    cardioEnvironment?: WorkoutCardioEnvironment;

    startAt?: string | null;
    endAt?: string | null;

    durationSeconds?: number | null;

    activeKcal?: number | null;
    totalKcal?: number | null;

    avgHr?: number | null;
    maxHr?: number | null;

    distanceKm?: number | null;
    steps?: number | null;
    elevationGainM?: number | null;

    paceSecPerKm?: number | null;
    cadenceRpm?: number | null;

    hasRoute?: boolean;
    routeSummary?: WorkoutRouteSummary | null;
    routePoints?: WorkoutRoutePoint[] | null;
    cardioMetrics?: WorkoutCardioMetrics | null;

    effortRpe?: number | null;

    notes?: string | null;
    exercises?: CreateSessionExerciseInput[] | null;

    meta?: Record<string, unknown> | null;
};

export type PatchSessionBody = Partial<CreateSessionBody> & {
    deleteMedia?: boolean;
};

export type AttachMediaItem = {
    publicId: string;
    url: string;
    resourceType: "image" | "video";
    format?: string | null;
    createdAt?: string | null;
    meta?: Record<string, unknown> | null;
};

export type AttachSessionMediaBody = {
    items: AttachMediaItem[];
};

export type ReturnDay = WorkoutDay;
export type ReturnSession = { session: WorkoutSession | null; day?: WorkoutDay | null };

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractHttpStatus(error: unknown): number | null {
    if (!isRecord(error)) return null;

    if (typeof error.status === "number") {
        return error.status;
    }

    const response = isRecord(error.response) ? error.response : null;
    return response && typeof response.status === "number" ? response.status : null;
}

/**
 * Ensures the canonical WorkoutDay exists without rewriting an existing day.
 * This avoids regenerating embedded session IDs before a dedicated PATCH.
 */
export async function ensureWorkoutDayExists(date: string): Promise<void> {
    try {
        const response = await api.get<unknown>(
            `/workout/days/${encodeURIComponent(date)}`
        );

        if (isRecord(response.data)) {
            return;
        }
    } catch (error: unknown) {
        if (extractHttpStatus(error) !== 404) {
            throw error;
        }
    }

    await api.put(`/workout/days/${encodeURIComponent(date)}`, {});
}

export async function getWorkoutDay(date: string): Promise<WorkoutDay> {
    const res = await api.get(`/workout/days/${encodeURIComponent(date)}`);
    return res.data as WorkoutDay;
}

export async function createSession(
    date: string,
    payload: CreateSessionBody,
    opts?: { returnMode?: SessionReturnMode }
): Promise<ReturnDay | ReturnSession> {
    const res = await api.post(`/workout/days/${encodeURIComponent(date)}/sessions`, payload, {
        params: opts?.returnMode ? { returnMode: opts.returnMode } : undefined,
    });
    return res.data as ReturnDay | ReturnSession;
}

export async function patchSession(
    date: string,
    sessionId: string,
    payload: PatchSessionBody,
    opts?: { returnMode?: SessionReturnMode }
): Promise<ReturnDay | ReturnSession> {
    const res = await api.patch(
        `/workout/days/${encodeURIComponent(date)}/sessions/${encodeURIComponent(sessionId)}`,
        payload,
        {
            params: opts?.returnMode ? { returnMode: opts.returnMode } : undefined,
        }
    );
    return res.data as ReturnDay | ReturnSession;
}

export async function deleteSession(
    date: string,
    sessionId: string,
    opts?: { returnMode?: SessionReturnMode; deleteMedia?: boolean }
): Promise<ReturnDay | ReturnSession> {
    const res = await api.delete(
        `/workout/days/${encodeURIComponent(date)}/sessions/${encodeURIComponent(sessionId)}`,
        {
            params: {
                ...(opts?.returnMode ? { returnMode: opts.returnMode } : {}),
                ...(typeof opts?.deleteMedia === "boolean"
                    ? { deleteMedia: opts.deleteMedia }
                    : {}),
            },
        }
    );

    return res.data as ReturnDay | ReturnSession;
}

export async function attachSessionMedia(
    date: string,
    sessionId: string,
    payload: AttachSessionMediaBody,
    opts?: { returnMode?: SessionReturnMode }
): Promise<ReturnDay | ReturnSession> {
    const res = await api.post(
        `/workout/days/${encodeURIComponent(date)}/sessions/${encodeURIComponent(sessionId)}/media/attach`,
        payload,
        {
            params: opts?.returnMode ? { returnMode: opts.returnMode } : undefined,
        }
    );

    return res.data as ReturnDay | ReturnSession;
}

function findGymCheckSessionFromDay(day: WorkoutDay): WorkoutSession | null {
    const sessions = Array.isArray(day.training?.sessions)
        ? day.training.sessions
        : [];

    return (
        sessions.find((session) => {
            const sessionKey = String(session.meta?.sessionKey ?? "");
            const sessionKind = String(session.meta?.sessionKind ?? "");

            return sessionKey === "gym_check" || sessionKind === "gym-check";
        }) ?? null
    );
}

function extractSessionIdFromReturn(payload: ReturnDay | ReturnSession): string | null {
    if (payload && typeof payload === "object" && "session" in payload) {
        const session = (payload as ReturnSession).session;
        return typeof session?.id === "string" ? session.id : null;
    }

    return null;
}

export async function upsertGymCheckSession(
    date: string,
    payload: CreateSessionBody,
    opts?: { returnMode?: SessionReturnMode }
): Promise<{ mode: "created" | "patched"; data: ReturnDay | ReturnSession; sessionId: string }> {
    await ensureWorkoutDayExists(date);

    const day = await getWorkoutDay(date);
    const existingSession = findGymCheckSessionFromDay(day);

    const returnMode: SessionReturnMode = opts?.returnMode ?? "day";

    if (existingSession) {
        const mergedMeta = mergeGymCheckSessionMeta(
            existingSession.meta,
            payload.meta
        );
        const patchPayload: PatchSessionBody = {
            ...payload,
            ...(mergedMeta !== undefined ? { meta: mergedMeta } : {}),
        };

        const data = await patchSession(
            date,
            existingSession.id,
            patchPayload,
            { returnMode }
        );
        return {
            mode: "patched",
            data,
            sessionId: existingSession.id,
        };
    }

    const created = await createSession(date, payload, { returnMode: "session" });
    const sessionId = extractSessionIdFromReturn(created);

    if (!sessionId) {
        throw new Error("Session created but response did not include session.id");
    }

    return { mode: "created", data: created, sessionId };
}
