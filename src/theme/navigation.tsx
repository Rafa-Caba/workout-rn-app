// src/theme/navigation.ts
import { AppHeader } from "@/src/features/components/topbar/AppHeader";
import type { Mode, Palette } from "@/src/theme/presets";

export type ThemeColors = {
    background: string;
    surface: string;
    text: string;
    mutedText: string;
    border: string;
    primary: string;
    primaryText: string;
};

export type ThemeLike = {
    mode: Mode;
    palette: Palette;
    resolvedScheme: "light" | "dark";
    colors: ThemeColors;
};

export function getStackHeaderScreenOptions(theme: ThemeLike): Record<string, any> {
    return {
        headerShown: true,

        // FULL CONTROL header (fixes the "pill wrapper" issue)
        header: (props: any) => <AppHeader {...props} />,

        // Keep these off because we're rendering our own title
        headerTitleAlign: "center",
    };
}

export function getBottomTabsScreenOptions(theme: ThemeLike, insetsBottom: number): Record<string, any> {
    const { colors } = theme;

    const baseHeight = 58;
    const bottomPad = Math.max(insetsBottom, 8);

    return {
        headerShown: false,
        tabBarHideOnKeyboard: true,

        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedText,

        tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: baseHeight + bottomPad,
            paddingTop: 6,
            paddingBottom: bottomPad,
        },

        tabBarLabelStyle: {
            fontWeight: "800",
            fontSize: 12,
        },

        tabBarItemStyle: {
            borderRadius: 12,
        },
    };
}