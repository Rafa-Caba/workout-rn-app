// /src/services/workout/routineAttachments.service.ts
import { api } from "@/src/services/http.client";

export type UploadAsset = {
    uri: string;
    name?: string;
    type?: string;
};

function guessFileName(uri: string): string {
    const clean = uri.split("?")[0];
    const last = clean.split("/").pop();
    if (last && last.trim().length > 0) return last;
    return `attachment_${Date.now()}`;
}

function guessMimeType(uri: string): string {
    const clean = uri.split("?")[0].toLowerCase();
    if (clean.endsWith(".png")) return "image/png";
    if (clean.endsWith(".webp")) return "image/webp";
    if (clean.endsWith(".jpg") || clean.endsWith(".jpeg")) return "image/jpeg";
    if (clean.endsWith(".mp4")) return "video/mp4";
    if (clean.endsWith(".mov")) return "video/quicktime";
    return "application/octet-stream";
}

export async function uploadRoutineAttachments(
    weekKey: string,
    files: UploadAsset[],
    query?: Record<string, string | number | boolean | undefined | null>
): Promise<unknown> {
    const form = new FormData();

    for (const f of files) {
        const uri = f?.uri;
        if (!uri) continue;

        const name = f.name?.trim() && f.name.trim().length > 0 ? f.name.trim() : guessFileName(uri);
        const type = f.type?.trim() && f.type.trim().length > 0 ? f.type.trim() : guessMimeType(uri);

        // RN FormData file shape: { uri, name, type }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        form.append("files", { uri, name, type } as any);
    }

    form.append("query", JSON.stringify(query ?? {}));

    // IMPORTANT (RN): do NOT set Content-Type manually (boundary issues)
    const res = await api.post(`/workout/routines/weeks/${encodeURIComponent(weekKey)}/attachments`, form);

    return res.data as unknown;
}

export async function deleteRoutineAttachment(
    weekKey: string,
    args: { publicId: string; deleteCloudinary?: boolean }
): Promise<unknown> {
    const res = await api.delete(`/workout/routines/weeks/${encodeURIComponent(weekKey)}/attachments`, {
        params: {
            publicId: args.publicId,
            deleteCloudinary: args.deleteCloudinary ?? true,
        },
    });

    return res.data as unknown;
}