// /src/types/upload.types.ts
// Shared React Native file contract for URI-backed multipart uploads.

export type RNFile = {
    uri: string;
    name: string;
    type: string;
    size?: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isRNFile(value: unknown): value is RNFile {
    if (!isRecord(value)) {
        return false;
    }

    return (
        typeof value.uri === "string" &&
        typeof value.name === "string" &&
        typeof value.type === "string" &&
        (value.size === undefined || value.size === null || typeof value.size === "number")
    );
}
