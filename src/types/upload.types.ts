// src/types/upload.types.ts
// Shared RN-friendly file type for multipart uploads.
// Web uses File/Blob; React Native uses { uri, name, type } objects.

export type RNFile = {
    uri: string;
    name: string;
    type: string;
    size?: number | null;
};

export function isRNFile(v: unknown): v is RNFile {
    if (!v || typeof v !== "object") return false;
    const anyV = v as any;
    return typeof anyV.uri === "string" && typeof anyV.name === "string" && typeof anyV.type === "string";
}