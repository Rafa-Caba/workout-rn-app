export type WeekStartsOn = 0 | 1; // 0 = Sunday, 1 = Monday

export type DebugSettings = {
    showJson: boolean;
};

export type DefaultsSettings = {
    // Useful for gym logging later
    defaultRpe: number | null; // 1..10
};

export type UserSettings = {
    // “App behavior” settings (per-user)
    language: "es" | "en" | null;
    weekStartsOn: WeekStartsOn;

    debug: DebugSettings;
    defaults: DefaultsSettings;
};

export type UserSettingsUpdateRequest = Partial<{
    language: "es" | "en" | null;
    weekStartsOn: WeekStartsOn;

    debug: Partial<DebugSettings>;
    defaults: Partial<DefaultsSettings>;
}>;
