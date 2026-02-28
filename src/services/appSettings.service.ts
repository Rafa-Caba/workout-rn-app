// /src/services/appSettings.service.ts
import { api } from "@/src/services/http.client";
import type { AppSettings } from "@/src/types/appSettings.types";

/**
 * GET /api/app-settings
 */
export async function getAppSettings(): Promise<AppSettings> {
    const res = await api.get<AppSettings>("/app-settings");
    return res.data;
}