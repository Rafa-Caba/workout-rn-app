// /src/store/adminSettings.store.ts
import { create } from "zustand";

import {
    fetchAdminSettings,
    updateAdminSettingsJson,
    uploadAdminSettingsLogo,
    type AdminSettingsUpdatePayload,
    type UploadAsset,
} from "@/src/services/admin/adminSettings.service";
import type { AdminSettings } from "@/src/types/adminSettings.types";

type AdminSettingsUpdateInput = AdminSettingsUpdatePayload & {
    logoFile?: UploadAsset | null;
};

type AdminSettingsState = {
    settings: AdminSettings | null;
    loading: boolean;
    saving: boolean;
    error: string | null;

    loadSettings: () => Promise<void>;
    updateSettings: (input: AdminSettingsUpdateInput) => Promise<AdminSettings | null>;
};

function getErrorMessage(e: unknown, fallback: string): string {
    if (typeof e === "object" && e !== null) {
        const anyErr = e as any;
        return anyErr?.response?.data?.error?.message ?? anyErr?.message ?? fallback;
    }
    return fallback;
}

export const useAdminSettingsStore = create<AdminSettingsState>((set) => ({
    settings: null,
    loading: false,
    saving: false,
    error: null,

    async loadSettings() {
        set({ loading: true, error: null });
        try {
            const data = await fetchAdminSettings();
            set({ settings: data, loading: false, error: null });
        } catch (e: unknown) {
            const msg = getErrorMessage(e, "No se pudieron cargar los ajustes.");
            set({ loading: false, error: msg });
        }
    },

    async updateSettings(input) {
        set({ saving: true, error: null });
        try {
            const { logoFile, ...rest } = input;

            // 1) Update JSON settings
            let current = await updateAdminSettingsJson(rest);

            // 2) Upload logo if provided
            if (logoFile) {
                current = await uploadAdminSettingsLogo(logoFile);
            }

            set({ settings: current, saving: false, error: null });
            return current;
        } catch (e: unknown) {
            const msg = getErrorMessage(e, "No se pudieron guardar los ajustes.");
            set({ saving: false, error: msg });
            return null;
        }
    },
}));