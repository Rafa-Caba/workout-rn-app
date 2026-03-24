// src/hooks/health/useBackfillRange.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { readHealthDayBundleByDate } from "@/src/services/health/health.service";
import { backfillWorkoutDaysRange } from "@/src/services/workout/days.service";
import type {
    WorkoutDayBackfillBody,
    WorkoutDayBackfillItem,
    WorkoutDayBackfillResult,
} from "@/src/types/workoutDay.types";
import { hasMeaningfulImportedSleep, mapImportedSleepToSleepBlock } from "@/src/utils/health/healthSleep.mapper";
import {
    hasMeaningfulImportedWorkoutMetrics,
    mapImportedWorkoutToMinimalDaySession,
} from "@/src/utils/health/healthWorkout.mapper";

type BackfillRangeArgs = {
    dates: string[];
    mode?: "merge" | "replace";
};

function uniqueSortedDates(dates: string[]): string[] {
    return Array.from(new Set(dates)).sort((a, b) => a.localeCompare(b));
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
                const bundle = await readHealthDayBundleByDate({ date });

                const mappedSleep =
                    bundle.sleep && hasMeaningfulImportedSleep(bundle.sleep)
                        ? mapImportedSleepToSleepBlock(bundle.sleep)
                        : null;

                const mappedSessions = bundle.workouts
                    .filter((session) => hasMeaningfulImportedWorkoutMetrics(session.metrics))
                    .map((session) => mapImportedWorkoutToMinimalDaySession(session));

                if (!mappedSleep && mappedSessions.length === 0) {
                    continue;
                }

                items.push({
                    date,
                    payload: {
                        ...(mappedSleep ? { sleep: mappedSleep } : {}),
                        ...(mappedSessions.length > 0
                            ? {
                                training: {
                                    source: mappedSessions[0]?.meta?.source ?? null,
                                    dayEffortRpe: null,
                                    raw: null,
                                    sessions: mappedSessions,
                                },
                            }
                            : {}),
                    },
                });
            }

            if (!items.length) {
                return null;
            }

            const body: WorkoutDayBackfillBody = {
                mode,
                days: items,
            };

            return backfillWorkoutDaysRange(body);
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