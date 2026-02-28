// /src/services/settings.service.ts
import { api } from "@/src/services/http.client";
import type { UserSettings, UserSettingsUpdateRequest } from "@/src/types/settings.types";

export async function getMySettings(): Promise<UserSettings> {
    const res = await api.get("/settings/me");
    return res.data as UserSettings;
}

export async function patchMySettings(payload: UserSettingsUpdateRequest): Promise<UserSettings> {
    const res = await api.patch("/settings/me", payload);
    return res.data as UserSettings;
}