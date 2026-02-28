// /src/theme/ThemeProvider.tsx
import { getZustandStorage } from "@/src/store/storage";
import * as React from "react";
import { Appearance, useColorScheme } from "react-native";
import type { Mode, Palette } from "./presets";

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

    // resolved from mode + system
    resolvedScheme: "light" | "dark";

    // basic tokens for consistent UI
    colors: ThemeColors;

    setMode: (mode: Mode) => void;
    setPalette: (palette: Palette) => void;

    // optional: helps avoid flicker on boot
    ready: boolean;
};

const ThemeContext = React.createContext<ThemeState | null>(null);

// Keep in sync with useThemeSyncFromAppSettings.ts
const LS_MODE = "workout.theme.mode";
const LS_PALETTE = "workout.theme.palette";

function resolveScheme(mode: Mode, system: "light" | "dark"): "light" | "dark" {
    if (mode === "light") return "light";
    if (mode === "dark") return "dark";
    return system;
}

function palettePrimary(palette: Palette): string {
    // You can refine these later to match your brand tokens
    switch (palette) {
        case "emerald":
            return "#10B981";
        case "violet":
            return "#8B5CF6";
        case "red":
            return "#EF4444";
        case "mint":
            return "#2DD4BF";
        case "blue":
        default:
            return "#2563EB";
    }
}

function buildColors(args: { scheme: "light" | "dark"; palette: Palette }): ThemeColors {
    const primary = palettePrimary(args.palette);

    if (args.scheme === "dark") {
        return {
            background: "#0B1220",
            surface: "#111827",
            text: "#F9FAFB",
            mutedText: "#9CA3AF",
            border: "#273244",
            primary,
            primaryText: "#FFFFFF",
        };
    }

    return {
        background: "#FFFFFF",
        surface: "#F9FAFB",
        text: "#111827",
        mutedText: "#6B7280",
        border: "#E5E7EB",
        primary,
        primaryText: "#FFFFFF",
    };
}

async function readInitial(): Promise<{ mode: Mode; palette: Palette } | null> {
    try {
        const storage = getZustandStorage();
        const [m, p] = await Promise.all([storage.getItem(LS_MODE), storage.getItem(LS_PALETTE)]);

        const mode = (m as Mode | null) ?? null;
        const palette = (p as Palette | null) ?? null;

        return {
            mode: mode ?? "system",
            palette: palette ?? "blue",
        };
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
    const sys = useColorScheme(); // "light" | "dark" | null
    const systemScheme: "light" | "dark" = sys === "dark" ? "dark" : "light";

    const [mode, setModeState] = React.useState<Mode>("system");
    const [palette, setPaletteState] = React.useState<Palette>("blue");
    const [ready, setReady] = React.useState(false);

    // Load saved theme once (AsyncStorage)
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

    // Persist whenever changes (after ready)
    React.useEffect(() => {
        if (!ready) return;
        void persist(mode, palette);
    }, [mode, palette, ready]);

    // Re-render on system changes when mode === "system"
    React.useEffect(() => {
        const sub = Appearance.addChangeListener(() => {
            // no-op: useColorScheme triggers re-render anyway in most cases,
            // but this ensures we re-evaluate in older RN environments.
            if (mode === "system") {
                // trigger state update without changing value
                setModeState((m) => m);
            }
        });

        return () => {
            // RN compatibility
            (sub as any)?.remove?.();
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