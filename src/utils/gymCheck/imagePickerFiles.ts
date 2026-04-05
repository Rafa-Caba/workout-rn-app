// src/utils/gymCheck/imagePickerFiles.ts

import type { RNFile } from "@/src/types/upload.types";
import * as ImagePicker from "expo-image-picker";

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

function guessNameFromUri(uri: string, index: number): string {
    const parts = uri.split("/");
    const last = parts[parts.length - 1] ?? "";
    const clean = last.trim();
    if (clean) return clean;
    return `upload_${Date.now()}_${index}`;
}

function normalizeTypeFromAsset(asset: ImagePicker.ImagePickerAsset): string {
    // Prefer explicit mimeType when Expo provides it (newer versions)
    const mimeType = (asset as any)?.mimeType;
    if (typeof mimeType === "string" && mimeType.trim()) return mimeType.trim();

    // Fallback to file extension guessing
    const uri = String(asset?.uri ?? "").trim();

    // asset.type is usually "image" | "video" in expo-image-picker
    const kind = (asset as any)?.type;
    if (kind === "video") return guessMimeFromUri(uri, "video/mp4");
    return guessMimeFromUri(uri, "image/jpeg");
}

function normalizeNameFromAsset(asset: ImagePicker.ImagePickerAsset, index: number): string {
    const fileName = (asset as any)?.fileName;
    if (typeof fileName === "string" && fileName.trim()) return fileName.trim();

    const uri = String(asset?.uri ?? "").trim();
    return guessNameFromUri(uri, index);
}

export async function pickMediaFiles(): Promise<RNFile[]> {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
        throw new Error("Permiso denegado para acceder a Fotos.");
    }

    const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 1,
        videoMaxDuration: 60 * 10,
    });

    if (res.canceled) return [];

    const assets = Array.isArray(res.assets) ? res.assets : [];
    const files: RNFile[] = [];

    assets.forEach((a, i) => {
        const uri = String(a?.uri ?? "").trim();
        if (!uri) return;

        const type = normalizeTypeFromAsset(a);
        const name = normalizeNameFromAsset(a, i);

        files.push({
            uri,
            name,
            type,
        });
    });

    return files;
}