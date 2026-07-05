// src/hooks/health/useBackfillRange.ts
// Hook para backfill histórico desde HealthKit / Health Connect.
// Usa Cardio para walking/running y conserva dedupe antes de mandar payloads
// al backend, evitando duplicar imports contra manual-cardio o app-live.

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { buildCardioBackfillPayloadForDate } from "@/src/services/health/cardio/cardioBackfill.service";
import { backfillWorkoutDaysRange } from "@/src/services/workout/days.service";
import type {
    WorkoutDayBackfillBody,
    WorkoutDayBackfillItem,
    WorkoutDayBackfillResult,
} from "@/src/types/workoutDay.types";
import { normalizeApiError } from "@/src/utils/api/apiErrorMessage";

type BackfillRangeArgs = {
    dates: string[];
    mode?: "merge" | "replace";
};

function uniqueSortedDates(dates: string[]): string[] {
    return Array.from(new Set(dates)).sort((a, b) => a.localeCompare(b));
}

function createHumanBackfillError(error: unknown): Error {
    const normalized = normalizeApiError(error);

    return new Error(normalized.message);
}

export function useBackfillRange() {
    const qc = useQueryClient();

    return useMutation<WorkoutDayBackfillResult | null, Error, BackfillRangeArgs>({
        mutationFn: async ({ dates, mode = "merge" }) => {
            const normalizedDates = uniqueSortedDates(dates);

            if (!normalizedDates.length) {
                return null;
            }

            const items: WorkoutDayBackfillItem[] = [];

            for (const date of normalizedDates) {
                const result = await buildCardioBackfillPayloadForDate({ date, mode });

                if (!result.payload) {
                    continue;
                }

                items.push({
                    date,
                    payload: result.payload,
                });
            }

            if (!items.length) {
                return null;
            }

            const body: WorkoutDayBackfillBody = {
                mode,
                days: items,
            };

            try {
                return await backfillWorkoutDaysRange(body);
            } catch (error: unknown) {
                throw createHumanBackfillError(error);
            }
        },
        onSuccess: (result) => {
            if (!result) {
                return;
            }

            for (const item of result.results) {
                if (item.ok && item.day && "date" in item.day) {
                    const dateValue = item.day.date;

                    if (typeof dateValue === "string" && dateValue.trim().length > 0) {
                        qc.setQueryData(["workoutDay", dateValue], item.day);
                    }
                }
            }
        },
    });
}
