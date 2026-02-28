// src/features/dashboard/components/DashboardMediaViewerModal.tsx
import React from "react";

import { MediaViewerModal, type MediaViewerItem } from "@/src/features/components/media/MediaViewerModal";
import type { MediaFeedItem } from "@/src/types/media.types";

type Props = {
    visible: boolean;
    item: MediaFeedItem | null;
    onClose: () => void;
};

export function DashboardMediaViewerModal({ visible, item, onClose }: Props) {
    if (!item) return null;

    const safeSessionType = (item.sessionType ?? "").trim() || "Sesión";
    const subtitle = item.date ? `${item.date} · ${safeSessionType}` : safeSessionType;

    const viewerItem: MediaViewerItem = {
        url: item.url,
        resourceType: item.resourceType === "image" ? "image" : "video",
        title: "Media",
        subtitle,
        tags: item.dayTags ?? [],
        notes: item.dayNotes?.trim() ?? null,
        metaRows: [
            { label: "Fuente", value: String(item.source ?? "—") },
            { label: "Semana", value: String(item.weekKey ?? "—") },
            { label: "Tipo", value: safeSessionType },
        ],
    };

    return <MediaViewerModal visible={visible} item={viewerItem} onClose={onClose} />;
}