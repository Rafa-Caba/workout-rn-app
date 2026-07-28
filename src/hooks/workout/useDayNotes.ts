// src/hooks/workout/useDayNotes.ts
// React Query mutations for atomic WorkoutDay note CRUD.

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiAxiosError } from "@/src/services/http.client";
import {
    createWorkoutDayNote,
    deleteWorkoutDayNote,
    updateWorkoutDayNote,
    type WorkoutDayNoteDeleteResponse,
    type WorkoutDayNoteMutationResponse,
} from "@/src/services/workout/dayNotes.service";
import type { WorkoutDayNoteDraft } from "@/src/types/workoutDay.types";

type CreateDayNoteArgs = {
    date: string;
    draft: WorkoutDayNoteDraft;
};

type UpdateDayNoteArgs = {
    date: string;
    noteId: string;
    draft: WorkoutDayNoteDraft;
};

type DeleteDayNoteArgs = {
    date: string;
    noteId: string;
};

export function useCreateDayNote() {
    const queryClient = useQueryClient();

    return useMutation<
        WorkoutDayNoteMutationResponse,
        ApiAxiosError,
        CreateDayNoteArgs
    >({
        mutationFn: ({ date, draft }) => createWorkoutDayNote(date, draft),
        onSuccess: async (result, variables) => {
            queryClient.setQueryData(["workoutDay", variables.date], result.day);

            await Promise.allSettled([
                queryClient.invalidateQueries({
                    queryKey: ["daySummary", variables.date],
                }),
                queryClient.invalidateQueries({ queryKey: ["workoutCalendar"] }),
                queryClient.invalidateQueries({ queryKey: ["workoutWeekView"] }),
            ]);
        },
    });
}

export function useUpdateDayNote() {
    const queryClient = useQueryClient();

    return useMutation<
        WorkoutDayNoteMutationResponse,
        ApiAxiosError,
        UpdateDayNoteArgs
    >({
        mutationFn: ({ date, noteId, draft }) =>
            updateWorkoutDayNote(date, noteId, draft),
        onSuccess: async (result, variables) => {
            queryClient.setQueryData(["workoutDay", variables.date], result.day);

            await Promise.allSettled([
                queryClient.invalidateQueries({
                    queryKey: ["daySummary", variables.date],
                }),
                queryClient.invalidateQueries({ queryKey: ["workoutCalendar"] }),
                queryClient.invalidateQueries({ queryKey: ["workoutWeekView"] }),
            ]);
        },
    });
}

export function useDeleteDayNote() {
    const queryClient = useQueryClient();

    return useMutation<
        WorkoutDayNoteDeleteResponse,
        ApiAxiosError,
        DeleteDayNoteArgs
    >({
        mutationFn: ({ date, noteId }) => deleteWorkoutDayNote(date, noteId),
        onSuccess: async (result, variables) => {
            queryClient.setQueryData(["workoutDay", variables.date], result.day);

            await Promise.allSettled([
                queryClient.invalidateQueries({
                    queryKey: ["daySummary", variables.date],
                }),
                queryClient.invalidateQueries({ queryKey: ["workoutCalendar"] }),
                queryClient.invalidateQueries({ queryKey: ["workoutWeekView"] }),
            ]);
        },
    });
}
