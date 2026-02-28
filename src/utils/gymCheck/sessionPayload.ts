import type { AttachMediaItem } from "@/src/services/workout/sessions.service";
import type { AttachmentOption } from "@/src/utils/routines/attachments";
import { DAY_KEYS, type DayKey } from "@/src/utils/routines/plan";
import { weekKeyToStartDate } from "@/src/utils/weekKey";
import { addDays, format } from "date-fns";

export function dayKeyToDateIso(weekKey: string, dayKey: DayKey): string | null {
    const start = weekKeyToStartDate(weekKey);
    if (!start) return null;
    const idx = DAY_KEYS.indexOf(dayKey);
    if (idx < 0) return null;
    return format(addDays(start, idx), "yyyy-MM-dd");
}

export function parseDurationMinutesToSeconds(input: unknown): number | undefined {
    if (typeof input !== "string") return undefined;
    const raw = input.trim();
    if (!raw) return undefined;

    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return undefined;

    return Math.round(n) * 60;
}

export function buildAttachMediaItemsFromGymDay(args: {
    gymDay: any;
    attachmentByPublicId: Map<string, AttachmentOption>;
}): AttachMediaItem[] {
    const out: AttachMediaItem[] = [];
    const seen = new Set<string>();

    const exMap = args.gymDay?.exercises ?? null;
    if (!exMap || typeof exMap !== "object") return out;

    for (const exState of Object.values(exMap) as any[]) {
        const done = Boolean(exState?.done);
        if (!done) continue;

        const ids: unknown = exState?.mediaPublicIds;
        if (!Array.isArray(ids) || ids.length === 0) continue;

        for (const pid of ids) {
            if (typeof pid !== "string" || !pid.trim()) continue;
            const publicId = pid.trim();
            if (seen.has(publicId)) continue;

            const opt = args.attachmentByPublicId.get(publicId);
            if (!opt) continue;

            const url = typeof opt.url === "string" ? opt.url.trim() : "";
            if (!url) continue;

            seen.add(publicId);

            out.push({
                publicId,
                url,
                resourceType: (opt as any).resourceType === "video" ? "video" : "image",
                format: (opt as any).format ?? null,
                createdAt: (opt as any).createdAt ?? null,
                meta: (opt as any).meta ?? null,
            });
        }
    }

    return out;
}
