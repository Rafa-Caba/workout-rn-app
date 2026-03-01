// /src/store/appSettings.store.ts
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { getAppSettings } from "@/src/services/appSettings.service";
import { getZustandStorage } from "@/src/store/storage";
import type { AppSettings } from "@/src/types/appSettings.types";

const DEFAULT_APP_SETTINGS: AppSettings = {
    appName: "Workout Tracker",
    appSubtitle: "Seguimiento de entrenamiento y sueño",
    logoUrl: null,
    themeDefaults: {
        mode: "system",
        palette: "blue",
    },
    debug: {
        showJson: false,
    },
};

type AppSettingsState = {
    settings: AppSettings;
    loading: boolean;
    error: string | null;
    lastLoadedAt: number | null;

    loadAppSettings: () => Promise<void>;
    setLocalFallback: (patch?: Partial<AppSettings>) => void;
};

export const useAppSettingsStore = create<AppSettingsState>()(
    persist(
        (set, get) => ({
            settings: DEFAULT_APP_SETTINGS,
            loading: false,
            error: null,
            lastLoadedAt: null,

            async loadAppSettings() {
                // Avoid duplicate concurrent calls
                if (get().loading) return;

                set({ loading: true, error: null });
                try {
                    const data = await getAppSettings();

                    // Merge with defaults to be null-safe in case BE changes/omits fields
                    const merged: AppSettings = {
                        ...DEFAULT_APP_SETTINGS,
                        ...data,
                        themeDefaults: {
                            ...DEFAULT_APP_SETTINGS.themeDefaults,
                            ...(data.themeDefaults ?? {}),
                        },
                        debug: {
                            ...DEFAULT_APP_SETTINGS.debug,
                            ...(data.debug ?? {}),
                        },
                    };

                    set({
                        settings: merged,
                        loading: false,
                        error: null,
                        lastLoadedAt: Date.now(),
                    });
                } catch (e: any) {
                    const msg = e?.response?.data?.error?.message ?? e?.message ?? "No se pudieron cargar los ajustes de la app.";
                    // Non-blocking: app can still work with persisted/default settings
                    set({ loading: false, error: msg });
                }
            },

            setLocalFallback(patch) {
                const current = get().settings;

                const next: AppSettings = {
                    ...current,
                    ...(patch ?? {}),
                    themeDefaults: {
                        ...current.themeDefaults,
                        ...(patch?.themeDefaults ?? {}),
                    },
                    debug: {
                        ...current.debug,
                        ...(patch?.debug ?? {}),
                    },
                };

                set({ settings: next });
            },
        }),
        {
            name: "app-settings-store",
            storage: createJSONStorage(() => getZustandStorage()),
            partialize: (state) => ({
                settings: state.settings,
                lastLoadedAt: state.lastLoadedAt,
            }),
        }
    )
);