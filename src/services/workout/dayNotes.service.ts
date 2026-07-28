// src/services/workout/dayNotes.service.ts
// Dedicated atomic API client for typed WorkoutDay notes.

import { api } from "@/src/services/http.client";
import type {
    WorkoutDay,
    WorkoutDayNote,
    WorkoutDayNoteDraft,
} from "@/src/types/workoutDay.types";

/**
 * Response returned when reading all structured notes for one day.
 */
export type WorkoutDayNotesListResponse = {
    date: string;
    notes: WorkoutDayNote[];
};

/**
 * Response returned after creating or updating one note.
 */
export type WorkoutDayNoteMutationResponse = {
    day: WorkoutDay;
    note: WorkoutDayNote;
};

/**
 * Response returned after deleting one note.
 */
export type WorkoutDayNoteDeleteResponse = {
    day: WorkoutDay;
    deletedNoteId: string;
};

function notesPath(date: string): string {
    return `/workout/days/${encodeURIComponent(date)}/notes`;
}

function notePath(date: string, noteId: string): string {
    return `${notesPath(date)}/${encodeURIComponent(noteId)}`;
}

export async function listWorkoutDayNotes(
    date: string
): Promise<WorkoutDayNotesListResponse> {
    const response = await api.get<WorkoutDayNotesListResponse>(notesPath(date));
    return response.data;
}

export async function createWorkoutDayNote(
    date: string,
    draft: WorkoutDayNoteDraft
): Promise<WorkoutDayNoteMutationResponse> {
    const response = await api.post<WorkoutDayNoteMutationResponse>(
        notesPath(date),
        draft
    );

    return response.data;
}

export async function updateWorkoutDayNote(
    date: string,
    noteId: string,
    draft: WorkoutDayNoteDraft
): Promise<WorkoutDayNoteMutationResponse> {
    const response = await api.patch<WorkoutDayNoteMutationResponse>(
        notePath(date, noteId),
        draft
    );

    return response.data;
}

export async function deleteWorkoutDayNote(
    date: string,
    noteId: string
): Promise<WorkoutDayNoteDeleteResponse> {
    const response = await api.delete<WorkoutDayNoteDeleteResponse>(
        notePath(date, noteId)
    );

    return response.data;
}
