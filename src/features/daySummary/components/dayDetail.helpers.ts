// /src/features/daySummary/components/dayDetail.helpers.ts

import type { MediaViewerItem } from "@/src/features/components/media/MediaViewerModal";
import type {
    WorkoutDay,
    WorkoutExercise,
    WorkoutExerciseSet,
    WorkoutMediaItem,
    WorkoutSession,
} from "@/src/types/workoutDay.types";

export type DayUiColors = {
    background: string;
    surface: string;
    border: string;
    text: string;
    mutedText: string;
};

export function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

export function sumNullable(values: Array<number | null | undefined>): number {
    let total = 0;

    for (const value of values) {
        if (isFiniteNumber(value)) {
            total += value;
        }
    }

    return total;
}

export function maxNullable(values: Array<number | null | undefined>): number | null {
    let max: number | null = null;

    for (const value of values) {
        if (!isFiniteNumber(value)) continue;
        if (max === null || value > max) {
            max = value;
        }
    }

    return max;
}

export function countMedia(sessions: WorkoutSession[]): number {
    let count = 0;

    for (const session of sessions) {
        const media = Array.isArray(session.media) ? session.media : [];
        count += media.length;
    }

    return count;
}

function looksLikeSimpleTime(value: string): boolean {
    return /^\d{1,2}:\d{2}$/.test(value.trim());
}

export function safeTime(value: string | null): string {
    if (!value) return "—";

    const raw = value.trim();
    if (!raw) return "—";

    /**
     * Gym Check manual sessions may store "HH:mm" directly instead of ISO.
     * Preserve that visible value as-is.
     */
    if (looksLikeSimpleTime(raw)) {
        const [hh, mm] = raw.split(":");
        return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    }

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;

    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");

    return `${hh}:${mm}`;
}

export function safePace(secondsPerKm: number | null): string {
    if (!isFiniteNumber(secondsPerKm) || secondsPerKm <= 0) return "—";

    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = Math.round(secondsPerKm % 60);

    return `${minutes}:${String(seconds).padStart(2, "0")} min/km`;
}

export function safeNumber(value: number | null): string {
    if (!isFiniteNumber(value)) return "—";
    return String(value);
}

export function safeDecimal(value: number | null, digits: number = 2): string {
    if (!isFiniteNumber(value)) return "—";
    return value.toFixed(digits);
}

export function normalizeSessions(day: WorkoutDay | null | undefined): WorkoutSession[] {
    return Array.isArray(day?.training?.sessions) ? day.training.sessions : [];
}

export function normalizeExercises(session: WorkoutSession): WorkoutExercise[] {
    return Array.isArray(session.exercises) ? session.exercises : [];
}

export function normalizeSets(exercise: WorkoutExercise): WorkoutExerciseSet[] {
    return Array.isArray(exercise.sets) ? exercise.sets : [];
}

export function normalizeMedia(session: WorkoutSession): WorkoutMediaItem[] {
    return Array.isArray(session.media) ? session.media : [];
}

export function sessionDisplayTitle(session: WorkoutSession): string {
    const base = String(session.type ?? "").trim();
    return base || "Sesión";
}

export function sessionDisplayNote(session: WorkoutSession): string {
    const note = String(session.notes ?? "").trim();
    return note || "Sin notas";
}

export function sessionDisplayDevice(session: WorkoutSession): string {
    const trainingSource = String(session.meta?.trainingSource ?? "").trim();
    if (trainingSource) {
        return trainingSource;
    }

    const sourceDevice = String(session.meta?.sourceDevice ?? "").trim();
    if (sourceDevice) {
        return sourceDevice;
    }

    return "—";
}

export function sessionDisplaySource(session: WorkoutSession): string {
    const source = String(session.meta?.source ?? "").trim();
    if (source) {
        return source;
    }

    const sessionKey = String(session.meta?.sessionKey ?? "").trim();
    if (sessionKey) {
        return sessionKey;
    }

    return "—";
}

export function sessionDisplayDayEffort(session: WorkoutSession): string {
    const value = session.meta?.dayEffortRpe;

    if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
    }

    return "—";
}

export function exerciseDisplayName(exercise: WorkoutExercise): string {
    const name = String(exercise.name ?? "").trim();
    return name || "Ejercicio";
}

export function exerciseDisplaySubtitle(exercise: WorkoutExercise): string | null {
    const movementName = String(exercise.movementName ?? "").trim();
    const name = String(exercise.name ?? "").trim();

    if (!movementName) return null;
    if (movementName.toLowerCase() === name.toLowerCase()) return null;

    return movementName;
}

export function toViewerItem(
    media: WorkoutMediaItem,
    ctx: {
        date: string;
        sessionType: string | null;
    }
): MediaViewerItem {
    const title = media.resourceType === "image" ? "Imagen" : "Video";
    const subtitle = `${ctx.date} • ${ctx.sessionType ?? "Sesión"}`;

    return {
        url: media.url,
        resourceType: media.resourceType,
        title,
        subtitle,
        tags: null,
        notes: null,
        metaRows: [
            { label: "Formato", value: media.format ? media.format.toUpperCase() : "—" },
            { label: "Sesión", value: ctx.sessionType ?? "—" },
        ],
    };
}