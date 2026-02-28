// /src/hooks/useThemeSyncFromAppSettings.ts
import { useAppSettingsStore } from "@/src/store/appSettings.store";
import { getZustandStorage } from "@/src/store/storage";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { Mode, Palette } from "@/src/theme/presets";
import * as React from "react";

// Keep in sync with ThemeProvider keys
const LS_MODE = "workout.theme.mode";
const LS_PALETTE = "workout.theme.palette";

async function hasExplicitThemePreference(): Promise<boolean> {
    try {
        const storage = getZustandStorage();
        const savedMode = await storage.getItem(LS_MODE);
        const savedPalette = await storage.getItem(LS_PALETTE);
        return Boolean(savedMode || savedPalette);
    } catch {
        return false;
    }
}

/**
 * Sync theme defaults from AppSettings ONLY when user has no explicit preference saved.
 * - If user has preference → do nothing.
 * - If not → apply server themeDefaults once.
 */
export function useThemeSyncFromAppSettings() {
    const { setMode, setPalette } = useTheme();

    const appSettings = useAppSettingsStore((s) => s.settings);
    const lastLoadedAt = useAppSettingsStore((s) => s.lastLoadedAt);

    const didApplyRef = React.useRef(false);

    React.useEffect(() => {
        let cancelled = false;

        async function run() {
            // Only attempt after we have settings (persisted or freshly loaded)
            if (!appSettings) return;

            // Prevent re-applying on every render/navigation
            if (didApplyRef.current) return;

            const hasPref = await hasExplicitThemePreference();

            if (cancelled) return;

            // If user already picked something, do not override it.
            if (hasPref) {
                didApplyRef.current = true;
                return;
            }

            // Apply server defaults
            const mode = (appSettings.themeDefaults?.mode ?? "system") as Mode;
            const palette = (appSettings.themeDefaults?.palette ?? "blue") as Palette;

            setMode(mode);
            setPalette(palette);

            didApplyRef.current = true;
        }

        void run();

        return () => {
            cancelled = true;
        };
    }, [appSettings, lastLoadedAt, setMode, setPalette]);
}