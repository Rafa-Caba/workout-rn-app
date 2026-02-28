// /src/services/workout/daySessions.service.ts
import { api } from "@/src/services/http.client";
import { ensureWorkoutDayExistsDays } from "@/src/services/workout/days.service";
import type { CreateWorkoutSessionBody } from "@/src/utils/gymCheck/buildGymCheckSession";

export type CreatedSessionResponse = {
    // Backend might return different shape; keep unknown-safe
    sessionId?: string;
    id?: string;
    created?: boolean;
    data?: unknown;
} & Record<string, unknown>;

export async function createWorkoutSessionForDay(
    date: string,
    body: CreateWorkoutSessionBody
): Promise<CreatedSessionResponse> {
    // Required because backend returns 404 if day doc doesn't exist
    await ensureWorkoutDayExistsDays(date);

    console.log("================");
    console.log("================");
    console.log("================");

    console.log({ body });

    console.log("================");
    console.log("================");
    console.log("================");
    const res = await api.post(`/workout/days/${encodeURIComponent(date)}/sessions`, body);

    console.log({ res });

    return res.data as CreatedSessionResponse;
}