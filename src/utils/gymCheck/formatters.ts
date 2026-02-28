export type MediaLikeItem = {
    url: string;
    publicId: string | null;
    resourceType?: string | null;
    format?: string | null;
    createdAt?: string | null;
    source?: string;
    meta?: unknown;
    originalName?: string | null;
};

import { extractAttachments, toAttachmentOptions, type AttachmentOption } from "@/src/utils/routines/attachments";

export function buildAttachmentsSet(routine: unknown): Set<string> {
    const list = extractAttachments(routine as any);
    const opts = toAttachmentOptions(list);

    const s = new Set<string>();
    for (const a of opts) {
        if (a && typeof a.publicId === "string" && a.publicId.trim()) s.add(a.publicId.trim());
    }
    return s;
}

export function diffNewAttachmentPublicIds(before: Set<string>, after: Set<string>): string[] {
    const added: string[] = [];
    for (const id of after) {
        if (!before.has(id)) added.push(id);
    }
    return added;
}

export function attachmentToMediaItem(opt: AttachmentOption): MediaLikeItem | null {
    const url = typeof opt.url === "string" ? opt.url : "";
    if (!url.trim()) return null;

    return {
        url,
        publicId: opt.publicId ?? null,
        resourceType: (opt as any).resourceType ?? null,
        format: (opt as any).format ?? null,
        createdAt: (opt as any).createdAt ?? null,
        source: "routine",
        meta: (opt as any).meta ?? null,
        originalName: (opt as any).originalName ?? null,
    };
}