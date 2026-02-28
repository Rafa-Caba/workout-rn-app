
export type AdminSettingsThemeMode = "light" | "dark" | "system";

export type AdminSettingsPalette =
    | "blue"
    | "emerald"
    | "violet"
    | "red"
    | "mint";

export interface AdminSettingsDebug {
    showJson: boolean;
}

export interface AdminSettingsThemeDefaults {
    mode: AdminSettingsThemeMode;
    palette: AdminSettingsPalette;
}

export interface AdminSettings {
    id: string;
    appName: string;
    appSubtitle: string | null;
    appLogoUrl: string | null;
    appLogoPublicId: string | null;
    debug: AdminSettingsDebug;
    themeDefaults: AdminSettingsThemeDefaults;
    createdAt: string;
    updatedAt: string;
}
