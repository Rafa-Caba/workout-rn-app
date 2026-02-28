// /src/store/settings.store.ts
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import * as settingsService from "@/src/services/settings.service";
import { getZustandStorage } from "@/src/store/storage";
import type { UserSettings, UserSettingsUpdateRequest, WeekStartsOn } from "@/src/types/settings.types";

type SettingsState = {
    settings: UserSettings;

    loading: boolean;
    error: string | null;
    lastLoadedAt: string | null;

    // Actions
    setShowJson: (show: boolean) => void;
    setWeekStartsOn: (v: WeekStartsOn) => void;
    setLanguagePref: (lang: "es" | "en" | null) => void;
    setDefaultRpe: (rpe: number | null) => void;

    load: () => Promise<void>;
    update: (payload: UserSettingsUpdateRequest) => Promise<void>;

    clearError: () => void;
};

const STORAGE_KEY = "workout-settings";

const defaultSettings: UserSettings = {
    language: null,
    weekStartsOn: 1,
    debug: { showJson: false },
    defaults: { defaultRpe: null },
};

function safeMergeSettings(base: UserSettings, next: Partial<UserSettings>): UserSettings {
    return {
        language: next.language ?? base.language ?? null,
        weekStartsOn: (next.weekStartsOn ?? base.weekStartsOn ?? 1) as WeekStartsOn,
        debug: {
            showJson: next.debug?.showJson ?? base.debug.showJson ?? false,
        },
        defaults: {
            defaultRpe: next.defaults?.defaultRpe ?? base.defaults.defaultRpe ?? null,
        },
    };
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set, get) => ({
            settings: defaultSettings,

            loading: false,
            error: null,
            lastLoadedAt: null,

            setShowJson: (show) => set((s) => ({ settings: safeMergeSettings(s.settings, { debug: { showJson: show } }) })),

            setWeekStartsOn: (v) => set((s) => ({ settings: safeMergeSettings(s.settings, { weekStartsOn: v }) })),

            setLanguagePref: (lang) => set((s) => ({ settings: safeMergeSettings(s.settings, { language: lang }) })),

            setDefaultRpe: (rpe) => set((s) => ({ settings: safeMergeSettings(s.settings, { defaults: { defaultRpe: rpe } }) })),

            clearError: () => set({ error: null }),

            load: async () => {
                set({ loading: true, error: null });
                try {
                    const server = await settingsService.getMySettings();
                    set((s) => ({
                        settings: safeMergeSettings(s.settings, server),
                        loading: false,
                        error: null,
                        lastLoadedAt: new Date().toISOString(),
                    }));
                } catch (e: any) {
                    // Graceful fallback: keep local settings
                    const msg = typeof e?.message === "string" ? e.message : "Failed to load settings (using local defaults)";
                    set({ loading: false, error: msg, lastLoadedAt: null });
                }
            },

            update: async (payload) => {
                set({ loading: true, error: null });

                // Optimistic local merge
                set((s) => ({
                    settings: safeMergeSettings(s.settings, payload as any),
                }));

                try {
                    const updated = await settingsService.patchMySettings(payload);
                    set((s) => ({
                        settings: safeMergeSettings(s.settings, updated),
                        loading: false,
                        error: null,
                        lastLoadedAt: new Date().toISOString(),
                    }));
                } catch (e: any) {
                    // If BE not ready, keep local saved state and show a friendly error
                    const msg = typeof e?.message === "string" ? e.message : "Backend settings not available yet. Saved locally.";
                    set({ loading: false, error: msg });
                }
            },
        }),
        {
            name: STORAGE_KEY,
            storage: createJSONStorage(() => getZustandStorage()),
            partialize: (s) => ({
                settings: s.settings,
                lastLoadedAt: s.lastLoadedAt,
            }),
        }
    )
);