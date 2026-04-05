// /src/services/health/outdoor/outdoorSessionMedia.service.ts

/**
 * Outdoor session media service.
 * Uses existing WorkoutDay media endpoints for:
 * - multipart upload
 * - delete by publicId
 * - attach already-uploaded items
 */

import { api } from "@/src/services/http.client";
import type { RNFile } from "@/src/types/upload.types";
import type { WorkoutMediaItem } from "@/src/types/workoutDay.types";

export type SessionMediaReturnMode = "day" | "session";

export type UploadOutdoorSessionMediaArgs = {
    date: string;
    sessionId: string;
    files: RNFile[];
    returnMode?: SessionMediaReturnMode;
};

export type UploadOutdoorSessionMediaResult = {
    uploadedCount: number;
};

export type DeleteOutdoorSessionMediaArgs = {
    date: string;
    sessionId: string;
    publicId: string;
    returnMode?: SessionMediaReturnMode;
};

export type DeleteOutdoorSessionMediaResult = {
    deleted: boolean;
};

export type AttachOutdoorSessionMediaArgs = {
    date: string;
    sessionId: string;
    items: WorkoutMediaItem[];
    returnMode?: SessionMediaReturnMode;
};

export type AttachOutdoorSessionMediaResult = {
    attachedCount: number;
};

type UploadApiResponse = {
    uploadedCount?: number;
};

type DeleteApiResponse = {
    cloudinary?: {
        deleted?: boolean;
        error?: string | null;
    } | null;
};

type AttachApiResponse = {
    attachedCount?: number;
    _attach?: {
        attachedCount?: number;
    } | null;
};

function buildSessionMediaPath(date: string, sessionId: string): string {
    return `/workout/days/${encodeURIComponent(date)}/sessions/${encodeURIComponent(sessionId)}/media`;
}

function toSafeMimeType(value: string | null | undefined): string {
    if (typeof value !== "string" || value.trim().length === 0) {
        return "application/octet-stream";
    }

    return value.trim();
}

function buildMultipartFieldName(files: RNFile[]): "file" | "files" {
    return files.length === 1 ? "file" : "files";
}

/**
 * React Native FormData file payload shape.
 * Kept isolated here because RN native multipart expects { uri, name, type }.
 */
type ReactNativeFormDataFilePart = {
    uri: string;
    name: string;
    type: string;
};

function appendRNFile(formData: FormData, fieldName: string, file: RNFile): void {
    const part: ReactNativeFormDataFilePart = {
        uri: file.uri,
        name: file.name,
        type: toSafeMimeType(file.type),
    };

    formData.append(fieldName, part as unknown as Blob);
}

export async function uploadOutdoorSessionMedia(
    args: UploadOutdoorSessionMediaArgs
): Promise<UploadOutdoorSessionMediaResult> {
    const { date, sessionId, files, returnMode = "session" } = args;

    if (!Array.isArray(files) || files.length === 0) {
        throw new Error("No se recibieron archivos para subir.");
    }

    const formData = new FormData();
    const fieldName = buildMultipartFieldName(files);

    for (const file of files) {
        appendRNFile(formData, fieldName, file);
    }

    const response = await api.post<UploadApiResponse>(
        buildSessionMediaPath(date, sessionId),
        formData,
        {
            params: { returnMode },
            headers: {
                "Content-Type": "multipart/form-data",
            },
        }
    );

    return {
        uploadedCount:
            typeof response.data?.uploadedCount === "number"
                ? response.data.uploadedCount
                : files.length,
    };
}

export async function deleteOutdoorSessionMedia(
    args: DeleteOutdoorSessionMediaArgs
): Promise<DeleteOutdoorSessionMediaResult> {
    const { date, sessionId, publicId, returnMode = "session" } = args;

    const response = await api.delete<DeleteApiResponse>(
        buildSessionMediaPath(date, sessionId),
        {
            params: {
                publicId,
                returnMode,
            },
        }
    );

    return {
        deleted: response.data?.cloudinary?.deleted === true || true,
    };
}

export async function attachOutdoorSessionMedia(
    args: AttachOutdoorSessionMediaArgs
): Promise<AttachOutdoorSessionMediaResult> {
    const { date, sessionId, items, returnMode = "session" } = args;

    const response = await api.post<AttachApiResponse>(
        `${buildSessionMediaPath(date, sessionId)}/attach`,
        { items },
        {
            params: { returnMode },
        }
    );

    const attachedCountFromTop =
        typeof response.data?.attachedCount === "number"
            ? response.data.attachedCount
            : null;

    const attachedCountFromAttach =
        typeof response.data?._attach?.attachedCount === "number"
            ? response.data._attach.attachedCount
            : null;

    return {
        attachedCount: attachedCountFromTop ?? attachedCountFromAttach ?? 0,
    };
}