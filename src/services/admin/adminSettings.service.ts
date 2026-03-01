// src/services/admin/adminSettings.service.ts
import { api } from "@/src/services/http.client";
import type { AdminSettings, AdminSettingsPalette, AdminSettingsThemeMode } from "@/src/types/adminSettings.types";
import type { RNFile } from "@/src/types/upload.types";

export interface AdminSettingsUpdatePayload {
    appName: string;
    appSubtitle?: string | null;
    debugShowJson: boolean;
    themeMode: AdminSettingsThemeMode;
    themePalette: AdminSettingsPalette;
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
 * IMPORTANT (RN): do NOT set Content-Type manually (boundary issues).
 */
export async function uploadAdminSettingsLogo(file: RNFile): Promise<AdminSettings> {
    if (!file?.uri || !file?.name || !file?.type) {
        throw new Error("Invalid RNFile");
    }

    const fd = new FormData();

    // RN FormData expects a file-like object: { uri, name, type }.
    // TypeScript's lib.dom definitions don't model this RN shape -> this cast is unavoidable in RN.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fd.append("image", { uri: file.uri, name: file.name, type: file.type } as any);

    const res = await api.post<AdminSettings>("/admin/settings/logo", fd);
    return res.data;
}