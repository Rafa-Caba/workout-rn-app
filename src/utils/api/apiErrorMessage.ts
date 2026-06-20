// src/utils/api/apiErrorMessage.ts
// Normaliza errores HTTP/Axios desconocidos hacia mensajes claros para UI.
// Mantiene tipado fuerte usando unknown y type guards.

export type ApiValidationDetails = {
    formErrors: string[];
    fieldErrors: Record<string, string[]>;
};

export type UiApiError = {
    status: number | null;
    code: string | null;
    message: string;
    details: ApiValidationDetails | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
    return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.filter((item): item is string => typeof item === "string");
}

function parseValidationDetails(value: unknown): ApiValidationDetails | null {
    if (!isRecord(value)) {
        return null;
    }

    const rawFieldErrors = value.fieldErrors;
    const fieldErrors: Record<string, string[]> = {};

    if (isRecord(rawFieldErrors)) {
        for (const [key, item] of Object.entries(rawFieldErrors)) {
            const messages = asStringArray(item);

            if (messages.length > 0) {
                fieldErrors[key] = messages;
            }
        }
    }

    return {
        formErrors: asStringArray(value.formErrors),
        fieldErrors,
    };
}

function getFirstValidationMessage(details: ApiValidationDetails | null): string | null {
    if (!details) {
        return null;
    }

    const firstFieldError = Object.entries(details.fieldErrors)[0];

    if (firstFieldError) {
        const [field, messages] = firstFieldError;
        const firstMessage = messages[0];

        if (firstMessage) {
            return `El servidor rechazó el campo "${field}": ${firstMessage}.`;
        }
    }

    const firstFormError = details.formErrors[0];

    if (firstFormError) {
        return `El servidor rechazó la solicitud: ${firstFormError}.`;
    }

    return null;
}

export function normalizeApiError(error: unknown): UiApiError {
    if (!isRecord(error)) {
        return {
            status: null,
            code: null,
            message: "No se pudo completar la operación.",
            details: null,
        };
    }

    const response = isRecord(error.response) ? error.response : null;
    const status = typeof response?.status === "number" ? response.status : null;

    const data = response && "data" in response ? response.data : null;
    const body = isRecord(data) ? data : null;

    const nestedError = isRecord(body?.error) ? body.error : null;

    const code = asString(nestedError?.code);
    const details = parseValidationDetails(nestedError?.details);

    const serverMessage =
        asString(nestedError?.message) ??
        asString(body?.message) ??
        asString(error.message);

    if (status === 400 && code === "VALIDATION_ERROR") {
        return {
            status,
            code,
            message:
                getFirstValidationMessage(details) ??
                serverMessage ??
                "El servidor rechazó algunos datos del backfill.",
            details,
        };
    }

    if (status === 400) {
        return {
            status,
            code,
            message:
                serverMessage ??
                "El servidor rechazó la solicitud. Revisa el rango o los datos importados.",
            details,
        };
    }

    if (status === 404) {
        return {
            status,
            code,
            message: serverMessage ?? "No se encontró el recurso solicitado.",
            details,
        };
    }

    if (status !== null && status >= 500) {
        return {
            status,
            code,
            message: "El servidor tuvo un problema procesando la solicitud. Intenta de nuevo.",
            details,
        };
    }

    return {
        status,
        code,
        message: serverMessage ?? "No se pudo completar la operación.",
        details,
    };
}