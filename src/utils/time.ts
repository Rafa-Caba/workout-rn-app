// src/utils/time.ts

/**
 * Convert seconds to minutes.
 * - Returns "—" if input is not a finite number.
 * - Default: rounds to nearest minute.
 */
export function secondsToMinutesOrDash(
    seconds: unknown,
    opts?: { mode?: "round" | "floor" | "ceil"; decimals?: number }
): number | "—" {
    if (typeof seconds !== "number" || !Number.isFinite(seconds)) return "—";

    const raw = seconds / 60;
    const mode = opts?.mode ?? "round";

    if (opts?.decimals !== undefined) {
        const d = Math.max(0, Math.min(6, Math.trunc(opts.decimals)));
        const factor = 10 ** d;
        return Math.round(raw * factor) / factor;
    }

    if (mode === "floor") return Math.floor(raw);
    if (mode === "ceil") return Math.ceil(raw);
    return Math.round(raw);
}