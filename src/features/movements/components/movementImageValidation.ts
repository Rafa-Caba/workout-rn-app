// /src/features/movements/components/movementImageValidation.ts
// Central validation for movement images before multipart upload.

import type { RNFile } from "@/src/types/upload.types";

const SUPPORTED_MIME_TYPES = new Set<string>([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
]);

const MIME_TYPE_BY_EXTENSION: Readonly<Record<string, string>> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
};

export const MOVEMENT_IMAGE_SUPPORTED_FORMATS = "JPG, JPEG, PNG, WEBP o GIF";

export class UnsupportedMovementImageTypeError extends Error {
    readonly code = "UNSUPPORTED_MOVEMENT_IMAGE_TYPE";
    readonly fileName: string;
    readonly receivedType: string | null;

    constructor(fileName: string, receivedType: string | null) {
        super(
            `Tipo de imagen no soportado. Usa ${MOVEMENT_IMAGE_SUPPORTED_FORMATS}.`,
        );
        this.name = "UnsupportedMovementImageTypeError";
        this.fileName = fileName;
        this.receivedType = receivedType;
    }
}

function normalizeMimeType(value: string | null | undefined): string | null {
    const normalized = String(value ?? "")
        .trim()
        .toLocaleLowerCase("en")
        .split(";", 1)[0];

    if (!normalized) {
        return null;
    }

    if (normalized === "image/jpg") {
        return "image/jpeg";
    }

    if (normalized === "image/x-png") {
        return "image/png";
    }

    return normalized;
}

function getFileExtension(fileName: string | null | undefined): string | null {
    const normalizedName = String(fileName ?? "").trim().toLocaleLowerCase("en");
    const dotIndex = normalizedName.lastIndexOf(".");

    if (dotIndex < 0 || dotIndex === normalizedName.length - 1) {
        return null;
    }

    return normalizedName.slice(dotIndex + 1);
}

/**
 * Resolves a trustworthy supported MIME type from picker metadata or filename.
 * Unknown formats are rejected instead of being mislabeled as JPEG.
 */
export function resolveMovementImageMimeType(
    mimeType: string | null | undefined,
    fileName: string | null | undefined,
): string | null {
    const normalizedMimeType = normalizeMimeType(mimeType);

    if (normalizedMimeType && SUPPORTED_MIME_TYPES.has(normalizedMimeType)) {
        return normalizedMimeType;
    }

    if (normalizedMimeType) {
        return null;
    }

    const extension = getFileExtension(fileName);
    return extension ? MIME_TYPE_BY_EXTENSION[extension] ?? null : null;
}

export function isSupportedMovementImageMimeType(value: string): boolean {
    return SUPPORTED_MIME_TYPES.has(normalizeMimeType(value) ?? "");
}

/**
 * Defense-in-depth validation used immediately before building FormData.
 */
export function assertSupportedMovementImage(file: RNFile): void {
    if (isSupportedMovementImageMimeType(file.type)) {
        return;
    }

    throw new UnsupportedMovementImageTypeError(file.name, file.type || null);
}

export function isUnsupportedMovementImageTypeError(
    error: unknown,
): error is UnsupportedMovementImageTypeError {
    return error instanceof UnsupportedMovementImageTypeError;
}
