// src/store/adminSettings.store.ts
import { create } from "zustand";

import type { AdminSettings, AdminSettingsPalette, AdminSettingsThemeMode } from "@/src/types/adminSettings.types";
import type { RNFile } from "@/src/types/upload.types";

import { fetchAdminSettings, updateAdminSettingsJson, uploadAdminSettingsLogo } from "@/src/services/admin/adminSettings.service";

export type AdminSettingsDraft = {
    appName: string;
    appSubtitle: string | null;
    debugShowJson: boolean;
    themeMode: AdminSettingsThemeMode;
    themePalette: AdminSettingsPalette;
    appLogoUrl: string | null;
};

type AdminSettingsState = {
    settings: AdminSettings | null;
    draft: AdminSettingsDraft;

    loading: boolean;
    saving: boolean;
    uploadingLogo: boolean;

    error: string | null;
    lastLoadedAt: string | null;

    load: () => Promise<void>;
    setDraft: (patch: Partial<AdminSettingsDraft>) => void;
    resetDraftFromSettings: () => void;

    saveJson: () => Promise<boolean>;
    uploadLogo: (file: RNFile) => Promise<boolean>;
};

const DEFAULT_DRAFT: AdminSettingsDraft = {
    appName: "Workout Tracker",
    appSubtitle: null,
    debugShowJson: false,
    themeMode: "system",
    themePalette: "blue",
    appLogoUrl: null,
};

function getErrorMessage(e: unknown, fallback: string): string {
    if (e instanceof Error && e.message.trim()) return e.message.trim();
    if (typeof e === "object" && e) {
        const maybe = e as { message?: unknown; response?: { data?: unknown } };
        if (typeof maybe.message === "string" && maybe.message.trim()) return maybe.message.trim();

        // Optional axios-like shape
        const data = maybe.response?.data as { error?: { message?: unknown }; message?: unknown } | undefined;
        const msg = data?.error?.message ?? data?.message;
        if (typeof msg === "string" && msg.trim()) return msg.trim();
    }
    return fallback;
}

function toDraft(s: AdminSettings | null): AdminSettingsDraft {
    if (!s) return { ...DEFAULT_DRAFT };

    return {
        appName: String(s.appName ?? "").trim() || DEFAULT_DRAFT.appName,
        appSubtitle: s.appSubtitle ?? null,
        debugShowJson: Boolean(s.debug?.showJson),
        themeMode: s.themeDefaults?.mode ?? "system",
        themePalette: s.themeDefaults?.palette ?? "blue",
        appLogoUrl: s.appLogoUrl ?? null,
    };
}

export const useAdminSettingsStore = create<AdminSettingsState>((set, get) => ({
    settings: null,
    draft: { ...DEFAULT_DRAFT },

    loading: false,
    saving: false,
    uploadingLogo: false,

    error: null,
    lastLoadedAt: null,

    async load() {
        if (get().loading) return;
        set({ loading: true, error: null });

        try {
            const data = await fetchAdminSettings();
            set({
                settings: data,
                draft: toDraft(data),
                loading: false,
                error: null,
                lastLoadedAt: new Date().toISOString(),
            });
        } catch (e: unknown) {
            set({
                loading: false,
                error: getErrorMessage(e, "No se pudieron cargar los ajustes de Admin."),
            });
        }
    },

    setDraft(patch) {
        set((s) => ({ draft: { ...s.draft, ...patch } }));
    },

    resetDraftFromSettings() {
        set((s) => ({ draft: toDraft(s.settings) }));
    },

    async saveJson() {
        const { draft } = get();
        set({ saving: true, error: null });

        try {
            const updated = await updateAdminSettingsJson({
                appName: draft.appName.trim(),
                appSubtitle: draft.appSubtitle?.trim() ? draft.appSubtitle.trim() : null,
                debugShowJson: draft.debugShowJson,
                themeMode: draft.themeMode,
                themePalette: draft.themePalette,
            });

            set({
                settings: updated,
                draft: toDraft(updated),
                saving: false,
                error: null,
                lastLoadedAt: new Date().toISOString(),
            });

            return true;
        } catch (e: unknown) {
            set({ saving: false, error: getErrorMessage(e, "No se pudieron guardar los ajustes.") });
            return false;
        }
    },

    async uploadLogo(file) {
        set({ uploadingLogo: true, error: null });

        try {
            const updated = await uploadAdminSettingsLogo(file);
            set({
                settings: updated,
                draft: toDraft(updated),
                uploadingLogo: false,
                error: null,
                lastLoadedAt: new Date().toISOString(),
            });
            return true;
        } catch (e: unknown) {
            set({ uploadingLogo: false, error: getErrorMessage(e, "No se pudo subir el logo.") });
            return false;
        }
    },
}));