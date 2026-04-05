// /src/utils/health/outdoor/outdoorSessionMedia.helpers.ts

/**
 * Helpers for displaying outdoor session media.
 */

import type {
    MediaViewerItem,
    MediaViewerResourceType,
} from "@/src/features/components/media/MediaViewerModal";
import type {
    WorkoutMediaItem,
    WorkoutSession,
} from "@/src/types/workoutDay.types";

export function formatOutdoorMediaDateTime(value: string | null | undefined): string {
    if (!value) {
        return "—";
    }

    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) {
        return "—";
    }

    return date.toLocaleString();
}

export function formatOutdoorMediaBytes(value: unknown): string {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        return "—";
    }

    if (value < 1024) {
        return `${value} B`;
    }

    if (value < 1024 * 1024) {
        return `${(value / 1024).toFixed(1)} KB`;
    }

    if (value < 1024 * 1024 * 1024) {
        return `${(value / (1024 * 1024)).toFixed(1)} MB`;
    }

    return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function getOutdoorMediaDisplayTitle(
    item: WorkoutMediaItem,
    session: WorkoutSession | null
): string {
    if (item.resourceType === "video") {
        return session?.activityType === "running"
            ? "Video de la carrera"
            : "Video de la sesión";
    }

    return session?.activityType === "running"
        ? "Foto de la carrera"
        : "Foto de la sesión";
}

export function getOutdoorMediaDisplaySubtitle(
    item: WorkoutMediaItem
): string | null {
    const originalName =
        typeof item.meta?.originalname === "string"
            ? item.meta.originalname
            : null;

    if (originalName && originalName.trim().length > 0) {
        return originalName.trim();
    }

    const createdAt = formatOutdoorMediaDateTime(item.createdAt);
    return createdAt === "—" ? null : createdAt;
}

export function getOutdoorMediaViewerResourceType(
    item: WorkoutMediaItem
): MediaViewerResourceType {
    return item.resourceType === "video" ? "video" : "image";
}

export function buildOutdoorMediaViewerItem(
    item: WorkoutMediaItem,
    session: WorkoutSession | null
): MediaViewerItem {
    const originalName =
        typeof item.meta?.originalname === "string"
            ? item.meta.originalname
            : "—";

    const mimeType =
        typeof item.meta?.mimetype === "string"
            ? item.meta.mimetype
            : "—";

    const bytesValue = item.meta?.bytes;

    return {
        url: item.url,
        resourceType: getOutdoorMediaViewerResourceType(item),
        title: getOutdoorMediaDisplayTitle(item, session),
        subtitle: getOutdoorMediaDisplaySubtitle(item),
        notes: session?.notes ?? null,
        tags: session?.activityType ? [session.activityType] : null,
        metaRows: [
            { label: "Tipo", value: item.resourceType === "video" ? "Video" : "Imagen" },
            { label: "Formato", value: item.format ?? "—" },
            { label: "Archivo", value: originalName },
            { label: "Mime", value: mimeType },
            { label: "Tamaño", value: formatOutdoorMediaBytes(bytesValue) },
            { label: "Creado", value: formatOutdoorMediaDateTime(item.createdAt) },
            { label: "Public ID", value: item.publicId },
        ],
    };
}