// /src/services/admin/adminSettings.service.ts
import { api } from "@/src/services/http.client";
import type { AdminSettings, AdminSettingsPalette, AdminSettingsThemeMode } from "@/src/types/adminSettings.types";

export interface AdminSettingsUpdatePayload {
    appName: string;
    appSubtitle?: string | null;
    debugShowJson: boolean;
    themeMode: AdminSettingsThemeMode;
    themePalette: AdminSettingsPalette;
}

export type UploadAsset = {
    uri: string;
    name?: string;
    type?: string;
};

function guessFileName(uri: string): string {
    const clean = uri.split("?")[0];
    const last = clean.split("/").pop();
    if (last && last.trim().length > 0) return last;
    return `logo_${Date.now()}.jpg`;
}

function guessMimeType(uri: string): string {
    const clean = uri.split("?")[0].toLowerCase();
    if (clean.endsWith(".png")) return "image/png";
    if (clean.endsWith(".webp")) return "image/webp";
    if (clean.endsWith(".jpg") || clean.endsWith(".jpeg")) return "image/jpeg";
    if (clean.endsWith(".heic")) return "image/heic";
    if (clean.endsWith(".heif")) return "image/heif";
    return "image/jpeg";
}

/**
 * GET /admin/settings
 */
export async function fetchAdminSettings(): Promise<AdminSettings> {
    const res = await api.get<AdminSettings>("/admin/settings");
    return res.data;
}

/**
 * PATCH /admin/settings
 * JSON only (no logo)
 */
export async function updateAdminSettingsJson(payload: AdminSettingsUpdatePayload): Promise<AdminSettings> {
    const res = await api.patch<AdminSettings>("/admin/settings", {
        appName: payload.appName,
        appSubtitle: payload.appSubtitle ?? null,
        debugShowJson: payload.debugShowJson,
        themeMode: payload.themeMode,
        themePalette: payload.themePalette,
    });

    return res.data;
}

/**
 * POST /admin/settings/logo
 * field name: "image"
 *
 * RN: pass UploadAsset { uri, name?, type? }
 * IMPORTANT: do NOT set Content-Type manually (boundary issues on RN).
 */
export async function uploadAdminSettingsLogo(file: UploadAsset): Promise<AdminSettings> {
    if (!file?.uri || typeof file.uri !== "string") {
        throw new Error("Invalid file uri");
    }

    const uri = file.uri;
    const name = file.name?.trim() && file.name.trim().length > 0 ? file.name.trim() : guessFileName(uri);
    const type = file.type?.trim() && file.type.trim().length > 0 ? file.type.trim() : guessMimeType(uri);

    const fd = new FormData();
    // RN FormData file shape: { uri, name, type }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fd.append("image", { uri, name, type } as any);

    const res = await api.post<AdminSettings>("/admin/settings/logo", fd);
    return res.data;
}