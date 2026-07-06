// src/utils/health/cardio/cardioHealthError.helpers.ts
// Normalizes HealthKit / Health Connect native errors into UI-safe messages
// and permission-aware guards for Cardio sync flows.

const ANDROID_HEALTH_CONNECT_PERMISSION_PATTERNS = [
    "SecurityException",
    "READ_EXERCISE",
    "READ_HEALTH_DATA_HISTORY",
    "android.permission.health",
    "Caller doesn't have",
];

const IOS_HEALTHKIT_PERMISSION_PATTERNS = [
    "HealthKit",
    "permission",
    "authorization",
    "not authorized",
];

export const CARDIO_HEALTH_PERMISSION_MESSAGE =
    "Health Connect / HealthKit necesita permisos de ejercicios para sincronizar Cardio. Pulsa Dar permisos y vuelve a intentar.";

export function getUnknownErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }

    if (typeof error === "string" && error.trim().length > 0) {
        return error;
    }

    return "";
}

function containsAnyPattern(message: string, patterns: string[]): boolean {
    const normalized = message.toLowerCase();

    return patterns.some((pattern) => normalized.includes(pattern.toLowerCase()));
}

export function isCardioHealthPermissionError(error: unknown): boolean {
    const message = getUnknownErrorMessage(error);

    if (message.length === 0) {
        return false;
    }

    return (
        containsAnyPattern(message, ANDROID_HEALTH_CONNECT_PERMISSION_PATTERNS) ||
        containsAnyPattern(message, IOS_HEALTHKIT_PERMISSION_PATTERNS)
    );
}

export function isCardioHealthPermissionMessage(message: string | null | undefined): boolean {
    if (typeof message !== "string" || message.trim().length === 0) {
        return false;
    }

    return (
        message === CARDIO_HEALTH_PERMISSION_MESSAGE ||
        containsAnyPattern(message, ANDROID_HEALTH_CONNECT_PERMISSION_PATTERNS) ||
        containsAnyPattern(message, IOS_HEALTHKIT_PERMISSION_PATTERNS)
    );
}

export function normalizeCardioHealthErrorMessage(
    error: unknown,
    fallback: string
): string {
    if (isCardioHealthPermissionError(error)) {
        return CARDIO_HEALTH_PERMISSION_MESSAGE;
    }

    const message = getUnknownErrorMessage(error);
    return message.length > 0 ? message : fallback;
}
