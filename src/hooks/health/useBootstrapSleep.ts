// src/hooks/health/useBootstrapSleep.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { readHealthSleepByDate } from "@/src/services/health/health.service";
import { saveImportedSleepForDay } from "@/src/services/workout/days.service";
import type { WorkoutDay } from "@/src/types/workoutDay.types";
import {
    hasMeaningfulImportedSleep,
} from "@/src/utils/health/healthSleep.mapper";

type BootstrapSleepArgs = {
    date: string;
};

export function useBootstrapSleep() {
    const qc = useQueryClient();

    return useMutation<WorkoutDay | null, Error, BootstrapSleepArgs>({
        mutationFn: async ({ date }) => {
            const importedSleep = await readHealthSleepByDate({ date });

            if (!importedSleep) {
                return null;
            }

            if (!hasMeaningfulImportedSleep(importedSleep)) {
                return null;
            }

            const day = await saveImportedSleepForDay(
                {
                    ...importedSleep,
                    date,
                },
                "merge"
            );

            return day;
        },
        onSuccess: (day, vars) => {
            if (!day) {
                return;
            }

            qc.setQueryData(["workoutDay", vars.date], day);
        },
    });
}