// /src/hooks/health/useBootstrapSleep.ts
// Imports normalized sleep from the current platform and keeps all day-related
// caches aligned after persistence.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Platform } from "react-native";

import { invalidateWorkoutDayRelatedQueries } from "@/src/query/invalidateWorkoutDayQueries";
import { queryKeys } from "@/src/query/queryKeys";
import {
    appendHealthDiagnosticEvent,
    createHealthDiagnosticId,
} from "@/src/services/health/diagnostics/healthDiagnostics.service";
import { readHealthSleepByDate } from "@/src/services/health/health.service";
import { saveImportedSleepForDay } from "@/src/services/workout/days.service";
import type { HealthProvider } from "@/src/types/health/cardio/health.types";
import type { WorkoutDay } from "@/src/types/workoutDay.types";
import { hasMeaningfulImportedSleep } from "@/src/utils/health/healthSleep.mapper";

type BootstrapSleepArgs = {
    date: string;
};

function currentProvider(): HealthProvider {
    return Platform.OS === "android" ? "health-connect" : "healthkit";
}

export function useBootstrapSleep() {
    const queryClient = useQueryClient();

    return useMutation<WorkoutDay | null, Error, BootstrapSleepArgs>({
        mutationFn: async ({ date }) => {
            try {
                const importedSleep = await readHealthSleepByDate({ date });

                if (!importedSleep || !hasMeaningfulImportedSleep(importedSleep)) {
                    await appendHealthDiagnosticEvent({
                        id: createHealthDiagnosticId("sleep-persistence"),
                        createdAt: new Date().toISOString(),
                        provider: currentProvider(),
                        level: "warning",
                        kind: "sleep-persistence",
                        targetDate: date,
                        saved: false,
                        rawPersisted: false,
                        errorMessage: "No meaningful normalized sleep was available to save.",
                    });
                    return null;
                }

                const day = await saveImportedSleepForDay(
                    {
                        ...importedSleep,
                        date,
                        raw: null,
                    },
                    "merge",
                );

                await appendHealthDiagnosticEvent({
                    id: createHealthDiagnosticId("sleep-persistence"),
                    createdAt: new Date().toISOString(),
                    provider: importedSleep.source === "health-connect"
                        ? "health-connect"
                        : "healthkit",
                    level: "info",
                    kind: "sleep-persistence",
                    targetDate: date,
                    saved: true,
                    rawPersisted: false,
                    errorMessage: null,
                });

                return day;
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error);

                await appendHealthDiagnosticEvent({
                    id: createHealthDiagnosticId("sleep-persistence"),
                    createdAt: new Date().toISOString(),
                    provider: currentProvider(),
                    level: "error",
                    kind: "sleep-persistence",
                    targetDate: date,
                    saved: false,
                    rawPersisted: false,
                    errorMessage: message,
                });

                throw error;
            }
        },
        onSuccess: async (day, variables) => {
            if (!day) return;

            queryClient.setQueryData(queryKeys.workout.day(variables.date), day);
            await invalidateWorkoutDayRelatedQueries(queryClient, {
                date: variables.date,
            });
        },
    });
}
