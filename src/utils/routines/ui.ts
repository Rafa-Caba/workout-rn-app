type ApiErrorLike = {
    message?: string;
    details?: unknown;

    response?: {
        data?: {
            error?: {
                message?: string;
                details?: unknown;
            };
        };
    };

    error?: {
        message?: string;
        details?: unknown;
    };
};

export function safeStringify(value: unknown) {
    return JSON.stringify(value, null, 2);
}

export function safeParseJson(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
    try {
        return { ok: true, value: JSON.parse(text) };
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Invalid JSON" };
    }
}

function extractApiErrorMessage(e: unknown, fallback: string): { msg: string; details?: string } {
    const err = e as ApiErrorLike | null;

    const msg =
        (typeof err?.message === "string" && err.message.trim() ? err.message.trim() : null) ??
        (typeof err?.error?.message === "string" && err.error.message.trim() ? err.error.message.trim() : null) ??
        (typeof err?.response?.data?.error?.message === "string" && err.response.data.error.message.trim()
            ? err.response.data.error.message.trim()
            : null) ??
        fallback;

    const rawDetails = err?.details ?? err?.error?.details ?? err?.response?.data?.error?.details;
    const details = rawDetails ? JSON.stringify(rawDetails, null, 2) : undefined;

    return { msg, details };
}

export function toastApiError(e: unknown, fallback: string) {
    const { msg, details } = extractApiErrorMessage(e, fallback);

    // RN-safe default: console warning
    // If later you add a RN toast library, you can replace this implementation
    // without changing callers.
    if (details) {
        console.warn(`[API ERROR] ${msg}\n${details}`);
        return;
    }
    console.warn(`[API ERROR] ${msg}`);
}

export function getRoutinePlaceholders(lang: "es" | "en") {
    if (lang === "es") {
        return {
            sessionType: "Ej. Pull Power",
            focus: "Ej. Espalda + bíceps",
            tags: "power, hypertrophy",
            notes: "Notas del día…",
            exNotes: "Opcional…",
            sets: "3",
            reps: "8-10",
            load: "kg / RPE",
        };
    }
    return {
        sessionType: "e.g. Pull Power",
        focus: "e.g. Back + biceps",
        tags: "power, hypertrophy",
        notes: "Day notes…",
        exNotes: "Optional…",
        sets: "3",
        reps: "8-10",
        load: "kg / RPE",
    };
}