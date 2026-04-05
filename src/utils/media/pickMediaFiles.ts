// /src/utils/media/pickMediaFiles.ts

import * as ImagePicker from "expo-image-picker";

import type { RNFile } from "@/src/types/upload.types";

/**
 * Guess MIME type from file URI extension when Expo does not provide mimeType.
 */
function guessMimeFromUri(uri: string, fallback: string): string {
    const lower = uri.toLowerCase();

    // images
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".heic")) return "image/heic";
    if (lower.endsWith(".heif")) return "image/heif";
    if (lower.endsWith(".webp")) return "image/webp";
    if (lower.endsWith(".gif")) return "image/gif";

    // videos
    if (lower.endsWith(".mp4")) return "video/mp4";
    if (lower.endsWith(".mov")) return "video/quicktime";
    if (lower.endsWith(".m4v")) return "video/x-m4v";
    if (lower.endsWith(".webm")) return "video/webm";

    return fallback;
}

/**
 * Build a filename from URI when Expo does not provide one.
 */
function guessNameFromUri(uri: string, index: number): string {
    const parts = uri.split("/");
    const last = parts[parts.length - 1] ?? "";
    const clean = last.trim();

    if (clean.length > 0) {
        return clean;
    }

    return `upload_${Date.now()}_${index}`;
}

type PickerAssetWithOptionalFields = ImagePicker.ImagePickerAsset & {
    mimeType?: string | null;
    fileName?: string | null;
    type?: "image" | "video" | "livePhoto" | "pairedVideo";
    fileSize?: number | null;
};

/**
 * Prefer explicit mimeType when available, otherwise infer from URI and asset type.
 */
function normalizeTypeFromAsset(asset: PickerAssetWithOptionalFields): string {
    if (typeof asset.mimeType === "string" && asset.mimeType.trim().length > 0) {
        return asset.mimeType.trim();
    }

    const uri = String(asset.uri ?? "").trim();

    if (asset.type === "video" || asset.type === "pairedVideo") {
        return guessMimeFromUri(uri, "video/mp4");
    }

    return guessMimeFromUri(uri, "image/jpeg");
}

/**
 * Prefer explicit fileName when available, otherwise infer from URI.
 */
function normalizeNameFromAsset(
    asset: PickerAssetWithOptionalFields,
    index: number
): string {
    if (typeof asset.fileName === "string" && asset.fileName.trim().length > 0) {
        return asset.fileName.trim();
    }

    const uri = String(asset.uri ?? "").trim();
    return guessNameFromUri(uri, index);
}

/**
 * Open media library and return RN-friendly files for multipart upload.
 */
export async function pickMediaFiles(): Promise<RNFile[]> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
        throw new Error("Permiso denegado para acceder a Fotos.");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        allowsMultipleSelection: true,
        quality: 1,
        videoMaxDuration: 60 * 10,
    });

    if (result.canceled) {
        return [];
    }

    const assets = Array.isArray(result.assets) ? result.assets : [];
    const files: RNFile[] = [];

    assets.forEach((rawAsset, index) => {
        const asset = rawAsset as PickerAssetWithOptionalFields;
        const uri = String(asset.uri ?? "").trim();

        if (!uri) {
            return;
        }

        const type = normalizeTypeFromAsset(asset);
        const name = normalizeNameFromAsset(asset, index);

        files.push({
            uri,
            name,
            type,
            size:
                typeof asset.fileSize === "number" && Number.isFinite(asset.fileSize)
                    ? asset.fileSize
                    : null,
        });
    });

    return files;
}