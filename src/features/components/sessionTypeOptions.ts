// src/features/components/sessionTypeOptions.ts
// Canonical session type options shared by forms and selectors.

export const SESSION_TYPE_OPTIONS = [
    "Upper",
    "Lower",
    "Upper/Lower",
    "Push",
    "Pull",
    "Leg Day",
    "Upper Power",
    "Push Power",
    "Pull Power",
    "Upper Hypertrophy",
    "Lower Hypertrophy",
    "Full Body",
    "Hypertrophy",
    "Strength Training",
    "Walking",
    "Running",
] as const;

export type SessionTypeOption = (typeof SESSION_TYPE_OPTIONS)[number];