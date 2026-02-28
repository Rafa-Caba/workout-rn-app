
export type UploadQueryValue = string | number | boolean | null | undefined;
export type UploadQuery = Record<string, UploadQueryValue>;

export function isUploadQuery(value: unknown): value is UploadQuery {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;

    const rec = value as Record<string, unknown>;
    for (const v of Object.values(rec)) {
        const ok =
            v === null ||
            v === undefined ||
            typeof v === "string" ||
            typeof v === "number" ||
            typeof v === "boolean";
        if (!ok) return false;
    }
    return true;
}
