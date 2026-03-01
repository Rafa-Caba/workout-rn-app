// src/hooks/admin/useAdminSettings.ts
import * as React from "react";

import { useAdminSettingsStore } from "@/src/store/adminSettings.store";

export function useAdminSettings(autoLoad: boolean = true) {
    const settings = useAdminSettingsStore((s) => s.settings);
    const draft = useAdminSettingsStore((s) => s.draft);

    const loading = useAdminSettingsStore((s) => s.loading);
    const saving = useAdminSettingsStore((s) => s.saving);
    const uploadingLogo = useAdminSettingsStore((s) => s.uploadingLogo);

    const error = useAdminSettingsStore((s) => s.error);
    const lastLoadedAt = useAdminSettingsStore((s) => s.lastLoadedAt);

    const load = useAdminSettingsStore((s) => s.load);
    const setDraft = useAdminSettingsStore((s) => s.setDraft);
    const resetDraftFromSettings = useAdminSettingsStore((s) => s.resetDraftFromSettings);

    const saveJson = useAdminSettingsStore((s) => s.saveJson);
    const uploadLogo = useAdminSettingsStore((s) => s.uploadLogo);

    React.useEffect(() => {
        if (!autoLoad) return;
        void load();
    }, [autoLoad, load]);

    return {
        settings,
        draft,
        loading,
        saving,
        uploadingLogo,
        error,
        lastLoadedAt,
        load,
        setDraft,
        resetDraftFromSettings,
        saveJson,
        uploadLogo,
    };
}