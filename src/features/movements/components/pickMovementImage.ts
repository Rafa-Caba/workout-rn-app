// src/features/movements/components/pickMovementImage.ts
import * as ImagePicker from "expo-image-picker";

import type { RNFile } from "@/src/types/upload.types";

function guessMimeType(fileName: string | null | undefined): string {
    const name = String(fileName ?? "").toLowerCase();
    if (name.endsWith(".png")) return "image/png";
    if (name.endsWith(".webp")) return "image/webp";
    if (name.endsWith(".gif")) return "image/gif";
    return "image/jpeg";
}

export async function pickMovementImage(): Promise<RNFile | null> {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;

    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
    });

    if (result.canceled) return null;

    const asset = result.assets?.[0];
    if (!asset?.uri) return null;

    const name = asset.fileName ?? `movement_${Date.now()}.jpg`;
    const type = asset.mimeType ?? guessMimeType(name);

    return {
        uri: asset.uri,
        name,
        type,
        size: typeof asset.fileSize === "number" ? asset.fileSize : null,
    };
}