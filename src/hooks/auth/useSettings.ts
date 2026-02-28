import { useSettingsStore } from "@/src/store/settings.store";
import * as React from "react";

export function useSettings(autoLoad: boolean = true) {
    const settings = useSettingsStore((s) => s.settings);
    const loading = useSettingsStore((s) => s.loading);
    const error = useSettingsStore((s) => s.error);
    const lastLoadedAt = useSettingsStore((s) => s.lastLoadedAt);

    const load = useSettingsStore((s) => s.load);
    const update = useSettingsStore((s) => s.update);

    React.useEffect(() => {
        if (!autoLoad) return;
        void load();
    }, [autoLoad, load]);

    return { settings, loading, error, lastLoadedAt, load, update };
}