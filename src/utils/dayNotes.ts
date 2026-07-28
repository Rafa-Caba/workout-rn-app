// src/utils/dayNotes.ts
// Shared labels and validation helpers for typed WorkoutDay notes.

import type {
    WorkoutDayNoteDraft,
    WorkoutDayNoteType,
} from "@/src/types/workoutDay.types";

export type DayNoteTypeOption = {
    value: WorkoutDayNoteType;
    emoji: string;
    label: string;
};

export const DAY_NOTE_TYPE_OPTIONS: readonly DayNoteTypeOption[] = [
    { value: "birthday", emoji: "🎁", label: "Cumpleaños" },
    { value: "appointment", emoji: "📅", label: "Cita" },
    { value: "reminder", emoji: "🔔", label: "Recordatorio" },
    { value: "health", emoji: "🩺", label: "Salud" },
    { value: "personal", emoji: "📝", label: "Personal" },
    { value: "other", emoji: "📌", label: "Otro" },
] as const;

export const DAY_NOTE_TITLE_MAX_LENGTH = 120;
export const DAY_NOTE_DESCRIPTION_MAX_LENGTH = 2_000;

export function getDayNoteTypeOption(
    type: WorkoutDayNoteType
): DayNoteTypeOption {
    return DAY_NOTE_TYPE_OPTIONS.find((option) => option.value === type)
        ?? DAY_NOTE_TYPE_OPTIONS[5];
}

/**
 * Normalizes form values into the exact backend draft contract.
 */
export function normalizeDayNoteDraft(args: {
    type: WorkoutDayNoteType;
    title: string;
    description: string;
}): WorkoutDayNoteDraft | null {
    const title = args.title.trim();
    const description = args.description.trim();

    if (!title || title.length > DAY_NOTE_TITLE_MAX_LENGTH) return null;
    if (description.length > DAY_NOTE_DESCRIPTION_MAX_LENGTH) return null;

    return {
        type: args.type,
        title,
        description: description.length > 0 ? description : null,
    };
}
