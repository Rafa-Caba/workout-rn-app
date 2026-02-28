export type AppSettingsThemeMode = "light" | "dark" | "system";

export type AppSettingsPalette = "blue" | "emerald" | "violet" | "red" | "mint";

export interface AppSettingsDebug {
    showJson: boolean;
}

export interface AppSettingsThemeDefaults {
    mode: AppSettingsThemeMode;
    palette: AppSettingsPalette;
}

export interface AppSettings {
    appName: string;
    logoUrl: string | null;
    themeDefaults: AppSettingsThemeDefaults;
    debug: AppSettingsDebug;
}
