// src/hooks/workout/useWorkoutCalendar.ts

/**
 * React Query wrapper for a typed WorkoutDay calendar range.
 */

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/src/query/queryKeys";

import type { ApiAxiosError } from "@/src/services/http.client";
import {
    getWorkoutCalendar,
    type GetWorkoutCalendarArgs,
} from "@/src/services/workout/calendar.service";
import type { CalendarViewResponse } from "@/src/types/workoutDay.types";

export function useWorkoutCalendar(args: GetWorkoutCalendarArgs) {
    return useQuery<CalendarViewResponse, ApiAxiosError>({
        queryKey: queryKeys.workout.calendar(args),
        queryFn: () => getWorkoutCalendar(args),
        enabled: Boolean(args.from && args.to),
        staleTime: 30_000,
    });
}
