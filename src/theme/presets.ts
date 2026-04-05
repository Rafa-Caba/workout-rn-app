// src/theme/presets.ts
export type Palette = "neutral" | "blue" | "emerald" | "violet" | "red" | "mint";
export type Mode = "light" | "dark" | "system";

export const PALETTES: { value: Palette; label: string }[] = [
    { value: "neutral", label: "Neutral" },
    { value: "blue", label: "Blue" },
    { value: "emerald", label: "Emerald" },
    { value: "violet", label: "Violet" },
    { value: "red", label: "Red" },
    { value: "mint", label: "Mint" },
];

export type ThemeColors = {
    background: string;
    surface: string;
    text: string;
    mutedText: string;
    border: string;
    primary: string;
    primaryText: string;
    card: string;

    // NEW
    danger: string;
    dangerText: string;
};

export function palettePrimary(palette: Palette): string {
    // Neutral keeps an accent color so primary actions stay obvious.
    // If you want monochrome neutral buttons too, tell me and we switch this.
    if (palette === "neutral") return "#2563EB";

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

export function resolveMode(mode: Mode): Exclude<Mode, "system"> {
    return mode === "dark" ? "dark" : "light";
}

function clamp01(n: number): number {
    if (n < 0) return 0;
    if (n > 1) return 1;
    return n;
}

function clamp255(n: number): number {
    if (n < 0) return 0;
    if (n > 255) return 255;
    return n;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const s = hex.replace("#", "").trim();
    const full = s.length === 3 ? `${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}` : s;
    const clean = full.length === 6 ? full : "000000";

    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);

    return {
        r: Number.isFinite(r) ? r : 0,
        g: Number.isFinite(g) ? g : 0,
        b: Number.isFinite(b) ? b : 0,
    };
}

function rgbToHex(rgb: { r: number; g: number; b: number }): string {
    const r = clamp255(Math.round(rgb.r)).toString(16).padStart(2, "0");
    const g = clamp255(Math.round(rgb.g)).toString(16).padStart(2, "0");
    const b = clamp255(Math.round(rgb.b)).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`.toUpperCase();
}

/**
 * Mix tint into base by amount:
 * amount=0 -> base
 * amount=1 -> tint
 */
function mixHex(baseHex: string, tintHex: string, amount: number): string {
    const a = clamp01(amount);
    const base = hexToRgb(baseHex);
    const tint = hexToRgb(tintHex);

    return rgbToHex({
        r: base.r + (tint.r - base.r) * a,
        g: base.g + (tint.g - base.g) * a,
        b: base.b + (tint.b - base.b) * a,
    });
}

function srgbToLinear(c: number): number {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
    const { r, g, b } = hexToRgb(hex);
    const R = srgbToLinear(r);
    const G = srgbToLinear(g);
    const B = srgbToLinear(b);
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function onColorText(bgHex: string): string {
    const lum = relativeLuminance(bgHex);
    return lum > 0.55 ? "#0B1220" : "#FFFFFF";
}

function isNeutralPalette(palette: Palette): boolean {
    return palette === "neutral";
}

/**
 * Neutral palette tokens (no tint):
 * - Light: white + subtle grays
 * - Dark: true near-black + zinc-like grays (no navy)
 */
function neutralBackground(mode: Exclude<Mode, "system">): string {
    return mode === "dark" ? "#0A0A0B" : "#FFFFFF";
}

function neutralSurface(mode: Exclude<Mode, "system">): string {
    return mode === "dark" ? "#121214" : "#F9FAFB";
}

function neutralBorder(mode: Exclude<Mode, "system">): string {
    return mode === "dark" ? "#232327" : "#E5E7EB";
}

/**
 * Tinted palettes:
 * Light: background 0.08, surface 0.05, border 0.12
 * Dark:  background 0.14, surface 0.12, border 0.20
 */
export function paletteBackground(palette: Palette, mode: Exclude<Mode, "system">): string {
    if (isNeutralPalette(palette)) return neutralBackground(mode);

    const primary = palettePrimary(palette);
    if (mode === "dark") {
        const base = "#0B1220";
        return mixHex(base, primary, 0.14);
    }

    const base = "#F8FAFC";
    return mixHex(base, primary, 0.08);
}

export function paletteCard(palette: Palette, mode: Exclude<Mode, "system">): string {
    if (isNeutralPalette(palette)) return neutralBackground(mode);

    const primary = palettePrimary(palette);
    if (mode === "dark") {
        const base = "#09204f";
        return mixHex(base, primary, 0.14);
    }

    const base = "#badbfc";
    return mixHex(base, primary, 0.08);
}

export function paletteSurface(palette: Palette, mode: Exclude<Mode, "system">): string {
    if (isNeutralPalette(palette)) return neutralSurface(mode);

    const primary = palettePrimary(palette);
    if (mode === "dark") {
        const base = "#111827";
        return mixHex(base, primary, 0.12);
    }

    const base = "#FFFFFF";
    return mixHex(base, primary, 0.05);
}

export function paletteBorder(palette: Palette, mode: Exclude<Mode, "system">): string {
    if (isNeutralPalette(palette)) return neutralBorder(mode);

    const primary = palettePrimary(palette);
    if (mode === "dark") {
        const base = "#1F2937";
        return mixHex(base, primary, 0.20);
    }

    const base = "#E2E8F0";
    return mixHex(base, primary, 0.12);
}

export function paletteText(mode: Exclude<Mode, "system">): string {
    // Works well for neutral and tinted
    return mode === "dark" ? "#F8FAFC" : "#111827";
}

export function paletteMutedText(mode: Exclude<Mode, "system">): string {
    // Slightly more neutral (zinc-like) to match the black/white look
    return mode === "dark" ? "#A1A1AA" : "#6B7280";
}

export function palettePrimaryText(palette: Palette): string {
    return onColorText(palettePrimary(palette));
}

// NEW: stable "danger" token (independent of palette)
export function paletteDanger(): string {
    return "#EF4444";
}

export function paletteDangerText(): string {
    return onColorText(paletteDanger());
}

export function buildThemeColors(palette: Palette, mode: Mode): ThemeColors {
    const m = resolveMode(mode);
    const primary = palettePrimary(palette);
    const danger = paletteDanger();

    return {
        background: paletteBackground(palette, m),
        surface: paletteSurface(palette, m),
        text: paletteText(m),
        mutedText: paletteMutedText(m),
        border: paletteBorder(palette, m),
        primary,
        primaryText: palettePrimaryText(palette),
        card: paletteCard(palette, m),

        danger,
        dangerText: paletteDangerText(),
    };
}