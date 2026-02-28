// /src/services/workout/sessions.service.ts
import { api } from "@/src/services/http.client";
import type { WorkoutDay, WorkoutSession } from "@/src/types/workout.types";

export type SessionReturnMode = "day" | "session";

export type CreateSessionBody = {
    type: string;

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

    effortRpe?: number | null;

    notes?: string | null;

    meta?: Record<string, unknown> | null;
};

export type PatchSessionBody = Partial<CreateSessionBody> & {
    deleteMedia?: boolean;
};

/**
 * Mirrors backend WorkoutMediaItemSchema (WorkoutDay.model).
 * Used by POST /days/:date/sessions/:sessionId/media/attach
 */
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

/**
 * Backend returnMode shapes (FE-safe union).
 */
export type ReturnDay = WorkoutDay;
export type ReturnSession = { session: WorkoutSession; day?: WorkoutDay | null };

export async function ensureWorkoutDayExists(date: string): Promise<void> {
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
    const res = await api.delete(`/workout/days/${encodeURIComponent(date)}/sessions/${encodeURIComponent(sessionId)}`, {
        params: {
            ...(opts?.returnMode ? { returnMode: opts.returnMode } : {}),
            ...(typeof opts?.deleteMedia === "boolean" ? { deleteMedia: opts.deleteMedia } : {}),
        },
    });
    return res.data as ReturnDay | ReturnSession;
}

/**
 * Attach EXISTING Cloudinary assets to a Day's session media array (no upload).
 * POST /workout/days/:date/sessions/:sessionId/media/attach?returnMode=day|session
 */
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

function findGymCheckSessionIdFromDay(day: WorkoutDay): string | null {
    const sessions = Array.isArray(day?.training?.sessions) ? day.training!.sessions : [];
    const hit = sessions?.find((s) => String(s?.meta?.sessionKey ?? "") === "gym_check") ?? null;
    return hit?.id ?? null;
}

function extractSessionIdFromReturn(payload: ReturnDay | ReturnSession): string | null {
    if (payload && typeof payload === "object" && "session" in payload) {
        const s = (payload as ReturnSession).session;
        return typeof s?.id === "string" ? s.id : null;
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
    const existingId = findGymCheckSessionIdFromDay(day);

    const returnMode: SessionReturnMode = opts?.returnMode ?? "day";

    if (existingId) {
        const data = await patchSession(date, existingId, payload, { returnMode });
        return { mode: "patched", data, sessionId: existingId };
    }

    // To guarantee we get session.id, force returnMode="session" when creating
    const created = await createSession(date, payload, { returnMode: "session" });
    const sessionId = extractSessionIdFromReturn(created);

    if (!sessionId) {
        throw new Error("Session created but response did not include session.id");
    }

    return { mode: "created", data: created, sessionId };
}