// /src/features/movements/components/movementErrorMessage.ts
// Converts client and API movement errors into concise user-facing messages.

import { isUnsupportedMovementImageTypeError } from "./movementImageValidation";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readApiErrorMessage(error: unknown): string | null {
    if (!isRecord(error) || !isRecord(error.response)) {
        return null;
    }

    const data = error.response.data;
    if (!isRecord(data) || !isRecord(data.error)) {
        return null;
    }

    const message = data.error.message;
    return typeof message === "string" && message.trim().length > 0
        ? message.trim()
        : null;
}

export function getMovementErrorMessage(
    error: unknown,
    fallback = "No se pudo completar la operación.",
): string {
    if (isUnsupportedMovementImageTypeError(error)) {
        return error.message;
    }

    const apiMessage = readApiErrorMessage(error);
    if (apiMessage) {
        return apiMessage;
    }

    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message.trim();
    }

    const text = String(error ?? "").trim();
    return text.length > 0 && text !== "[object Object]" ? text : fallback;
}
