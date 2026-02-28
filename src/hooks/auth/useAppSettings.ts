import { useAppSettingsStore } from "@/src/store/appSettings.store";
import * as React from "react";

export function useAppSettings(autoLoad: boolean = true) {
    const settings = useAppSettingsStore((s) => s.settings);
    const loading = useAppSettingsStore((s) => s.loading);
    const error = useAppSettingsStore((s) => s.error);
    const lastLoadedAt = useAppSettingsStore((s) => s.lastLoadedAt);

    const loadAppSettings = useAppSettingsStore((s) => s.loadAppSettings);
    const setLocalFallback = useAppSettingsStore((s) => s.setLocalFallback);

    React.useEffect(() => {
        if (!autoLoad) return;
        void loadAppSettings();
    }, [autoLoad, loadAppSettings]);

    return {
        settings,
        loading,
        error,
        lastLoadedAt,
        loadAppSettings,
        setLocalFallback,
    };
}