// src/theme/ThemeProvider.tsx
import { getZustandStorage } from "@/src/store/storage";
import * as React from "react";
import { Appearance, useColorScheme } from "react-native";

import type { Mode, Palette } from "./presets";
import {
    paletteBackground,
    paletteBorder,
    paletteMutedText,
    palettePrimary,
    palettePrimaryText,
    paletteSurface,
    paletteText,
} from "./presets";

type ThemeColors = {
    background: string;
    surface: string;
    text: string;
    mutedText: string;
    border: string;
    primary: string;
    primaryText: string;
};

type ThemeState = {
    mode: Mode;
    palette: Palette;
    resolvedScheme: "light" | "dark";
    colors: ThemeColors;

    setMode: (mode: Mode) => void;
    setPalette: (palette: Palette) => void;

    ready: boolean;
};

const ThemeContext = React.createContext<ThemeState | null>(null);

const LS_MODE = "workout.theme.mode";
const LS_PALETTE = "workout.theme.palette";

const MODE_VALUES: Mode[] = ["light", "dark", "system"];
const PALETTE_VALUES: Palette[] = ["neutral", "blue", "emerald", "violet", "red", "mint"];

function isMode(v: string | null): v is Mode {
    if (!v) return false;
    return MODE_VALUES.includes(v as Mode);
}

function isPalette(v: string | null): v is Palette {
    if (!v) return false;
    return PALETTE_VALUES.includes(v as Palette);
}

function resolveScheme(mode: Mode, system: "light" | "dark"): "light" | "dark" {
    if (mode === "light") return "light";
    if (mode === "dark") return "dark";
    return system;
}

function buildColors(args: { scheme: "light" | "dark"; palette: Palette }): ThemeColors {
    const primary = palettePrimary(args.palette);

    return {
        background: paletteBackground(args.palette, args.scheme),
        surface: paletteSurface(args.palette, args.scheme),
        text: paletteText(args.scheme),
        mutedText: paletteMutedText(args.scheme),
        border: paletteBorder(args.palette, args.scheme),
        primary,
        primaryText: palettePrimaryText(args.palette),
    };
}

async function readInitial(): Promise<{ mode: Mode; palette: Palette } | null> {
    try {
        const storage = getZustandStorage();
        const [m, p] = await Promise.all([storage.getItem(LS_MODE), storage.getItem(LS_PALETTE)]);

        const modeRaw = typeof m === "string" ? m : null;
        const paletteRaw = typeof p === "string" ? p : null;

        const mode: Mode = isMode(modeRaw) ? modeRaw : "system";
        const palette: Palette = isPalette(paletteRaw) ? paletteRaw : "neutral";

        return { mode, palette };
    } catch {
        return null;
    }
}

async function persist(mode: Mode, palette: Palette): Promise<void> {
    try {
        const storage = getZustandStorage();
        await Promise.all([storage.setItem(LS_MODE, mode), storage.setItem(LS_PALETTE, palette)]);
    } catch {
        // ignore
    }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const sys = useColorScheme();
    const systemScheme: "light" | "dark" = sys === "dark" ? "dark" : "light";

    const [mode, setModeState] = React.useState<Mode>("system");
    const [palette, setPaletteState] = React.useState<Palette>("neutral");
    const [ready, setReady] = React.useState(false);

    React.useEffect(() => {
        let cancelled = false;

        async function run() {
            const init = await readInitial();
            if (cancelled) return;

            if (init) {
                setModeState(init.mode);
                setPaletteState(init.palette);
            }

            setReady(true);
        }

        void run();

        return () => {
            cancelled = true;
        };
    }, []);

    React.useEffect(() => {
        if (!ready) return;
        void persist(mode, palette);
    }, [mode, palette, ready]);

    React.useEffect(() => {
        const sub = Appearance.addChangeListener(() => {
            if (mode === "system") {
                setModeState((m) => m);
            }
        });

        return () => {
            sub.remove();
        };
    }, [mode]);

    const resolvedScheme = React.useMemo(() => resolveScheme(mode, systemScheme), [mode, systemScheme]);
    const colors = React.useMemo(() => buildColors({ scheme: resolvedScheme, palette }), [resolvedScheme, palette]);

    const value: ThemeState = React.useMemo(
        () => ({
            mode,
            palette,
            resolvedScheme,
            colors,
            setMode: setModeState,
            setPalette: setPaletteState,
            ready,
        }),
        [mode, palette, resolvedScheme, colors, ready]
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const ctx = React.useContext(ThemeContext);
    if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
    return ctx;
}