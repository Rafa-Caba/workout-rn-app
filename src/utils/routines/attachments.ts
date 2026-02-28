export type Attachment = {
    publicId?: string;
    url?: string;
    resourceType?: string;
    format?: string;
    createdAt?: string;
    meta?: Record<string, unknown>;
    originalName?: string;
};

export type AttachmentOption = {
    publicId: string;
    label: string;
    url?: string;
    resourceType?: string;
    originalName?: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null;
}

export function extractAttachments(routine: unknown): Attachment[] {
    if (!isRecord(routine)) return [];
    const a = (routine as Record<string, unknown>).attachments;
    if (!Array.isArray(a)) return [];
    return a as Attachment[];
}

export function toAttachmentOptions(attachments: Attachment[]): AttachmentOption[] {
    return attachments
        .filter((a) => typeof a.publicId === "string" && a.publicId.length > 0)
        .map((a) => ({
            publicId: a.publicId as string,
            label: a.originalName ?? (a.publicId as string),
            url: a.url,
            resourceType: a.resourceType,
            originalName: a.originalName,
        }));
}

export function pickLatestAttachmentPublicId(attachments: Attachment[]): string | null {
    const valid = attachments.filter((a) => typeof a.publicId === "string" && a.publicId.length > 0);
    if (valid.length === 0) return null;

    const sorted = valid
        .map((a) => ({ a, ts: a.createdAt ? Date.parse(a.createdAt) : NaN }))
        .sort((x, y) => {
            const xt = Number.isFinite(x.ts) ? x.ts : -Infinity;
            const yt = Number.isFinite(y.ts) ? y.ts : -Infinity;
            return yt - xt;
        });

    const best = sorted[0]?.a ?? valid[valid.length - 1];
    return (best.publicId as string) ?? null;
}

export function isLikelyImage(a: { resourceType?: string; url?: string }) {
    if (a.resourceType === "image") return true;
    const u = a.url ?? "";
    return /\.(png|jpg|jpeg|webp|gif)(\?.*)?$/i.test(u);
}

export function isLikelyVideo(a: { resourceType?: string; url?: string }) {
    if (a.resourceType === "video") return true;
    const u = a.url ?? "";
    return /\.(mp4|mov|webm)(\?.*)?$/i.test(u);
}
