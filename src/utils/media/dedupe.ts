// src/utils/media/dedupe.ts

import { MediaFeedItem } from "@/src/types/media.types";

function parseTimeMs(v: string): number {
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : 0;
}

export function dedupeMediaFeedItems(items: MediaFeedItem[]): MediaFeedItem[] {
    const bestByPublicId = new Map<string, MediaFeedItem>();

    for (const item of items) {
        const pid = item.publicId?.trim();
        if (!pid) continue;

        const current = bestByPublicId.get(pid);
        if (!current) {
            bestByPublicId.set(pid, item);
            continue;
        }

        // Prefer day over routine
        if (item.source === "day" && current.source !== "day") {
            bestByPublicId.set(pid, item);
            continue;
        }
        if (item.source !== "day" && current.source === "day") {
            continue;
        }

        // Same source: newest wins
        if (parseTimeMs(item.createdAt) > parseTimeMs(current.createdAt)) {
            bestByPublicId.set(pid, item);
        }
    }

    // Preserve original order, pick best
    const out: MediaFeedItem[] = [];
    const used = new Set<string>();

    for (const item of items) {
        const pid = item.publicId?.trim();
        if (!pid || used.has(pid)) continue;

        const best = bestByPublicId.get(pid);
        if (best) {
            out.push(best);
            used.add(pid);
        }
    }

    return out;
}
