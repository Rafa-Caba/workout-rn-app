// /src/theme/navigation.tsx
// Typed navigation options shared by Expo Router stacks and bottom tabs.

import type { BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";

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

/**
 * Returns the common native-stack header configuration.
 * The theme argument keeps one stable API for every layout that consumes it.
 */
export function getStackHeaderScreenOptions(_theme: ThemeLike): NativeStackNavigationOptions {
    return {
        headerShown: true,
        header: (props) => <AppHeader {...props} />,
        headerTitleAlign: "center",
    };
}

/**
 * Returns the common bottom-tab options while respecting the device safe area.
 */
export function getBottomTabsScreenOptions(
    theme: ThemeLike,
    insetsBottom: number,
): BottomTabNavigationOptions {
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
