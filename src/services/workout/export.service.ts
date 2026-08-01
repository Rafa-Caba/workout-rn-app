// /src/services/workout/export.service.ts
// Downloads a complete workout report, writes it to the native cache,
// and opens the iOS/Android share sheet so the user can save or send it.

import { isAxiosError } from "axios";
import { File, Paths } from "expo-file-system";

import { api } from "@/src/services/http.client";
import type {
    WorkoutReportFile,
    WorkoutReportFormat,
    WorkoutReportRequest,
} from "@/src/types/workoutExport.types";

const EXPORT_REQUEST_TIMEOUT_MS = 120_000;
const MAX_ERROR_BODY_BYTES = 65_536;

const DEFAULT_FILENAMES: Record<WorkoutReportFormat, string> = {
    xlsx: "workout-report.xlsx",
    pdf: "workout-report.pdf",
};

const MIME_TYPES: Record<WorkoutReportFormat, string> = {
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pdf: "application/pdf",
};

const IOS_UTI_TYPES: Record<WorkoutReportFormat, string> = {
    xlsx: "org.openxmlformats.spreadsheetml.sheet",
    pdf: "com.adobe.pdf",
};

type ExpoSharingModule = typeof import("expo-sharing");
type UnknownRecord = Record<string, unknown>;

/**
 * Detects the native-module mismatch produced when Metro loads current JS
 * inside an older development client that was compiled without ExpoSharing.
 */
function isMissingExpoSharingNativeModule(error: unknown): boolean {
    const message =
        error instanceof Error
            ? error.message
            : typeof error === "string"
                ? error
                : "";

    return (
        message.includes("Cannot find native module 'ExpoSharing'") ||
        message.includes('Cannot find native module "ExpoSharing"')
    );
}

/**
 * Loads expo-sharing only when the user requests an export. This prevents an
 * older native binary from crashing the entire app during module startup.
 * The export action still requires a binary compiled with ExpoSharing.
 */
async function loadSharingModule(): Promise<ExpoSharingModule> {
    try {
        return await import("expo-sharing");
    } catch (error: unknown) {
        if (isMissingExpoSharingNativeModule(error)) {
            throw new Error(
                "Esta instalación de Workout App no incluye el módulo nativo para compartir archivos. Recompila e instala el development client actualizado.",
            );
        }

        throw error;
    }
}

function isRecord(value: unknown): value is UnknownRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isArrayBuffer(value: unknown): value is ArrayBuffer {
    return value instanceof ArrayBuffer;
}

function isArrayBufferView(value: unknown): value is ArrayBufferView {
    return ArrayBuffer.isView(value);
}

/**
 * Axios returns an ArrayBuffer on native when responseType is "arraybuffer".
 * The additional ArrayBufferView branch keeps the conversion safe if an
 * adapter returns a typed-array view instead.
 */
function toBytes(value: unknown): Uint8Array {
    if (isArrayBuffer(value)) {
        return new Uint8Array(value);
    }

    if (isArrayBufferView(value)) {
        return new Uint8Array(
            value.buffer,
            value.byteOffset,
            value.byteLength,
        );
    }

    throw new Error(
        "El API devolvió un archivo con un formato binario inválido.",
    );
}

function readHeaderValue(value: unknown): string | null {
    if (typeof value === "string" && value.trim()) {
        return value.trim();
    }

    if (Array.isArray(value)) {
        const firstString = value.find(
            (entry): entry is string =>
                typeof entry === "string" && Boolean(entry.trim()),
        );

        return firstString?.trim() ?? null;
    }

    return null;
}

function decodeFilename(value: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

function sanitizeFilename(value: string, fallback: string): string {
    const normalized = value
        .replace(/[\\/:*?"<>|\u0000-\u001F]/g, "-")
        .replace(/\s+/g, " ")
        .trim();

    return normalized || fallback;
}

/**
 * Reads filename= and filename*= values from Content-Disposition.
 * RFC 5987 filename* is preferred when both are present.
 */
function getFilenameFromContentDisposition(
    contentDisposition: string | null,
    fallback: string,
): string {
    if (!contentDisposition) {
        return fallback;
    }

    const encodedMatch = contentDisposition.match(
        /filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i,
    );

    if (encodedMatch?.[1]) {
        const value = encodedMatch[1].trim().replace(/^"|"$/g, "");
        return sanitizeFilename(decodeFilename(value), fallback);
    }

    const regularMatch = contentDisposition.match(
        /filename\s*=\s*(?:"([^"]+)"|([^;]+))/i,
    );
    const value = regularMatch?.[1] ?? regularMatch?.[2];

    return value
        ? sanitizeFilename(value.trim(), fallback)
        : fallback;
}

function resolveMimeType(
    headerValue: string | null,
    format: WorkoutReportFormat,
): string {
    const headerMimeType = headerValue?.split(";", 1)[0]?.trim();
    return headerMimeType || MIME_TYPES[format];
}

function createCachedFile(filename: string, bytes: Uint8Array): File {
    const file = new File(Paths.cache, filename);

    if (file.exists) {
        file.delete();
    }

    file.write(bytes);
    return file;
}

function hasExpectedFileSignature(
    bytes: Uint8Array,
    format: WorkoutReportFormat,
): boolean {
    if (format === "xlsx") {
        return (
            bytes.length >= 4 &&
            bytes[0] === 0x50 &&
            bytes[1] === 0x4b &&
            bytes[2] === 0x03 &&
            bytes[3] === 0x04
        );
    }

    return (
        bytes.length >= 4 &&
        bytes[0] === 0x25 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x44 &&
        bytes[3] === 0x46
    );
}

/**
 * Decodes small UTF-8 API error bodies without requiring another native
 * dependency. Export files themselves are never converted to text.
 */
function decodeUtf8ErrorBody(bytes: Uint8Array): string {
    const limited = bytes.subarray(
        0,
        Math.min(bytes.length, MAX_ERROR_BODY_BYTES),
    );
    const encoded = Array.from(
        limited,
        (byte) => `%${byte.toString(16).padStart(2, "0")}`,
    ).join("");

    try {
        return decodeURIComponent(encoded);
    } catch {
        return Array.from(
            limited,
            (byte) => String.fromCharCode(byte),
        ).join("");
    }
}

function readApiErrorMessage(value: unknown): string | null {
    if (!isRecord(value)) return null;

    if (typeof value.message === "string" && value.message.trim()) {
        return value.message.trim();
    }

    const nestedError = value.error;

    if (typeof nestedError === "string" && nestedError.trim()) {
        return nestedError.trim();
    }

    if (
        isRecord(nestedError) &&
        typeof nestedError.message === "string" &&
        nestedError.message.trim()
    ) {
        return nestedError.message.trim();
    }

    return null;
}

function readMessageFromBytes(bytes: Uint8Array): string | null {
    const text = decodeUtf8ErrorBody(bytes).trim();

    if (!text) return null;

    try {
        return readApiErrorMessage(JSON.parse(text)) ?? text;
    } catch {
        return text;
    }
}

function normalizeExportError(error: unknown): Error {
    if (isAxiosError(error)) {
        const data = error.response?.data;

        try {
            const message = readMessageFromBytes(toBytes(data));

            if (message) {
                return new Error(message);
            }
        } catch {
            // The response was not binary; continue with the standard message.
        }

        if (error.message.trim()) {
            return new Error(error.message.trim());
        }
    }

    if (error instanceof Error && error.message.trim()) {
        return error;
    }

    return new Error("No se pudo generar el archivo.");
}

/**
 * Generates the report through the authenticated API client and returns a
 * local file ready for previewing, sharing, or saving through the OS sheet.
 */
export async function generateWorkoutReport(
    request: WorkoutReportRequest,
): Promise<WorkoutReportFile> {
    try {
        const response = await api.post<unknown>("/workout/export", request, {
            responseType: "arraybuffer",
            timeout: EXPORT_REQUEST_TIMEOUT_MS,
        });

        const bytes = toBytes(response.data);

        if (!hasExpectedFileSignature(bytes, request.format)) {
            const message = readMessageFromBytes(bytes);

            throw new Error(
                message ??
                "El API no devolvió un archivo de exportación válido.",
            );
        }

        const fallbackFilename = DEFAULT_FILENAMES[request.format];
        const contentDisposition = readHeaderValue(
            response.headers["content-disposition"],
        );
        const contentType = readHeaderValue(
            response.headers["content-type"],
        );
        const filename = getFilenameFromContentDisposition(
            contentDisposition,
            fallbackFilename,
        );
        const mimeType = resolveMimeType(contentType, request.format);
        const file = createCachedFile(filename, bytes);

        return {
            filename,
            mimeType,
            uri: file.uri,
        };
    } catch (error: unknown) {
        throw normalizeExportError(error);
    }
}

/**
 * Opens the native share/save sheet for a generated report.
 */
export async function shareWorkoutReport(
    request: WorkoutReportRequest,
): Promise<WorkoutReportFile> {
    const Sharing = await loadSharingModule();
    const sharingAvailable = await Sharing.isAvailableAsync();

    if (!sharingAvailable) {
        throw new Error(
            "Compartir archivos no está disponible en este dispositivo.",
        );
    }

    const reportFile = await generateWorkoutReport(request);

    await Sharing.shareAsync(reportFile.uri, {
        dialogTitle: `Guardar o compartir ${reportFile.filename}`,
        mimeType: reportFile.mimeType,
        UTI: IOS_UTI_TYPES[request.format],
    });

    return reportFile;
}