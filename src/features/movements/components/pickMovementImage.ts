// /src/features/movements/components/pickMovementImage.ts
// Picks one movement image and rejects unsupported formats before upload.

import * as ImagePicker from "expo-image-picker";

import type { RNFile } from "@/src/types/upload.types";

import {
    resolveMovementImageMimeType,
    UnsupportedMovementImageTypeError,
} from "./movementImageValidation";

function getExtensionForMimeType(mimeType: string): string {
    switch (mimeType) {
        case "image/png":
            return "png";
        case "image/webp":
            return "webp";
        case "image/gif":
            return "gif";
        case "image/jpeg":
        default:
            return "jpg";
    }
}

export async function pickMovementImage(): Promise<RNFile | null> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
        return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
    });

    if (result.canceled) {
        return null;
    }

    const asset = result.assets?.[0];
    if (!asset?.uri) {
        return null;
    }

    const originalName = asset.fileName?.trim() || null;
    const resolvedMimeType = resolveMovementImageMimeType(
        asset.mimeType,
        originalName,
    );

    if (!resolvedMimeType) {
        throw new UnsupportedMovementImageTypeError(
            originalName ?? "imagen seleccionada",
            asset.mimeType ?? null,
        );
    }

    const name =
        originalName ??
        `movement_${Date.now()}.${getExtensionForMimeType(resolvedMimeType)}`;

    return {
        uri: asset.uri,
        name,
        type: resolvedMimeType,
        size: typeof asset.fileSize === "number" ? asset.fileSize : null,
    };
}
