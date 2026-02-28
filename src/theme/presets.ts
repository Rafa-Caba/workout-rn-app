// /src/theme/presets.ts
export type Palette = "blue" | "emerald" | "violet" | "red" | "mint";
export type Mode = "light" | "dark" | "system";

export const PALETTES: { value: Palette; label: string }[] = [
    { value: "blue", label: "Blue" },
    { value: "emerald", label: "Emerald" },
    { value: "violet", label: "Violet" },
    { value: "red", label: "Red" },
    { value: "mint", label: "Mint" },
];