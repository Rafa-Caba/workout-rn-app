// src/hooks/workout/useWorkoutDay.ts

import { useQuery } from "@tanstack/react-query";

import type { ApiAxiosError } from "@/src/services/http.client";
import { getWorkoutDayServ } from "@/src/services/workout/days.service";
import type { WorkoutDay } from "@/src/types/workoutDay.types";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNumericStatus(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toStatus(error: unknown): number | null {
    if (!isRecord(error)) return null;

    const directStatus = readNumericStatus(error.status);
    if (directStatus !== null) return directStatus;

    const response = error.response;
    if (!isRecord(response)) return null;

    return readNumericStatus(response.status);
}

/**
 * Returns WorkoutDay | null.
 * - If backend returns missing day (404), we return null instead of crashing the screen.
 * - Compatible signature:
 *    useWorkoutDay(date)
 *    useWorkoutDay(date, enabled)
 */
export function useWorkoutDay(date: string | null, enabled: boolean = true) {
    const isEnabled = enabled && Boolean(date);

    return useQuery<WorkoutDay | null, ApiAxiosError>({
        queryKey: ["workoutDay", date ?? null],
        queryFn: async () => {
            if (!date) return null;

            try {
                return await getWorkoutDayServ(date);
            } catch (error: unknown) {
                if (toStatus(error) === 404) return null;
                throw error;
            }
        },
        enabled: isEnabled,
        staleTime: 30_000,
    });
}