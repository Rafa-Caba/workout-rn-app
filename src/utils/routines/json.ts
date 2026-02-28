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
