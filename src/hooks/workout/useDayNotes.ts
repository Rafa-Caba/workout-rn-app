// /src/hooks/workout/useDayNotes.ts
// React Query mutations for atomic WorkoutDay note CRUD.

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { invalidateWorkoutDayRelatedQueries } from "@/src/query/invalidateWorkoutDayQueries";
import { queryKeys } from "@/src/query/queryKeys";
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

async function updateDayNoteCaches(
    queryClient: QueryClient,
    date: string,
    day: WorkoutDayNoteMutationResponse["day"],
): Promise<void> {
    queryClient.setQueryData(queryKeys.workout.day(date), day);
    await invalidateWorkoutDayRelatedQueries(queryClient, { date });
}

export function useCreateDayNote() {
    const queryClient = useQueryClient();

    return useMutation<
        WorkoutDayNoteMutationResponse,
        ApiAxiosError,
        CreateDayNoteArgs
    >({
        mutationFn: ({ date, draft }) => createWorkoutDayNote(date, draft),
        onSuccess: async (result, variables) => {
            await updateDayNoteCaches(
                queryClient,
                variables.date,
                result.day,
            );
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
            await updateDayNoteCaches(
                queryClient,
                variables.date,
                result.day,
            );
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
            await updateDayNoteCaches(
                queryClient,
                variables.date,
                result.day,
            );
        },
    });
}
