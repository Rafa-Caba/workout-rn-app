// src/hooks/health/useDayAutoBootstrap.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as React from "react";

import { useBootstrapSleep } from "@/src/hooks/health/useBootstrapSleep";
import { useBootstrapWorkoutSession } from "@/src/hooks/health/useBootstrapWorkoutSession";
import { ensureWorkoutDayExistsDays, getWorkoutDayServ } from "@/src/services/workout/days.service";
import type { WorkoutDay } from "@/src/types/workoutDay.types";

type DayAutoBootstrapArgs = {
    date: string;
};

type DayAutoBootstrapResult = {
    day: WorkoutDay | null;
    bootstrappedSleep: boolean;
    bootstrappedWorkout: boolean;
};

function hasExistingSleep(day: WorkoutDay | null): boolean {
    if (!day?.sleep) {
        return false;
    }

    return [
        day.sleep.timeAsleepMinutes,
        day.sleep.timeInBedMinutes,
        day.sleep.score,
        day.sleep.awakeMinutes,
        day.sleep.remMinutes,
        day.sleep.coreMinutes,
        day.sleep.deepMinutes,
    ].some((value) => typeof value === "number" && Number.isFinite(value));
}

function hasExistingWorkoutSessions(day: WorkoutDay | null): boolean {
    return Array.isArray(day?.training?.sessions) && day.training.sessions.length > 0;
}

export function useDayAutoBootstrap() {
    const qc = useQueryClient();

    const bootstrapSleep = useBootstrapSleep();
    const bootstrapWorkout = useBootstrapWorkoutSession();

    const mutation = useMutation<DayAutoBootstrapResult, Error, DayAutoBootstrapArgs>({
        mutationFn: async ({ date }) => {
            await ensureWorkoutDayExistsDays(date);

            let currentDay = await getWorkoutDayServ(date);
            let bootstrappedSleep = false;
            let bootstrappedWorkout = false;

            if (!hasExistingSleep(currentDay)) {
                const sleepResult = await bootstrapSleep.mutateAsync({ date });

                if (sleepResult) {
                    currentDay = sleepResult;
                    bootstrappedSleep = true;
                } else {
                    currentDay = await getWorkoutDayServ(date);
                }
            }

            if (!hasExistingWorkoutSessions(currentDay)) {
                const workoutResult = await bootstrapWorkout.mutateAsync({ date });

                if (workoutResult.day) {
                    currentDay = workoutResult.day;
                } else {
                    currentDay = await getWorkoutDayServ(date);
                }

                bootstrappedWorkout = workoutResult.mode !== "noop";
            }

            return {
                day: currentDay,
                bootstrappedSleep,
                bootstrappedWorkout,
            };
        },
        onSuccess: (result, vars) => {
            if (!result.day) {
                return;
            }

            qc.setQueryData(["workoutDay", vars.date], result.day);
        },
    });

    const autoBootstrapDay = React.useCallback(
        async (args: DayAutoBootstrapArgs) => mutation.mutateAsync(args),
        [mutation]
    );

    return {
        ...mutation,
        autoBootstrapDay,
        isBootstrappingSleep: bootstrapSleep.isPending,
        isBootstrappingWorkout: bootstrapWorkout.isPending,
    };
}