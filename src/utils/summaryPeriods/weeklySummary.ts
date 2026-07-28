// src/utils/summaryPeriods/weeklySummary.ts
// Helpers shared with Web so daily training totals use the same calculation rules.

import type { CalendarDayFull, WorkoutSession } from "@/src/types/workoutDay.types";

export type TrainingDayRow = {
    date: string;
    sessionsCount: number;
    durationSeconds: number | null;
    activeKcal: number | null;
    avgHr: number | null;
    maxHr: number | null;
    mediaCount: number;
};

function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

function getSessions(day: CalendarDayFull): WorkoutSession[] {
    return Array.isArray(day.training?.sessions) ? day.training.sessions : [];
}

function sumNumbers(values: readonly (number | null | undefined)[]): number | null {
    const finiteValues = values.filter(isFiniteNumber);
    return finiteValues.length > 0
        ? finiteValues.reduce((sum, value) => sum + value, 0)
        : null;
}

function computeAverageHr(sessions: readonly WorkoutSession[]): number | null {
    const weightedSessions = sessions.filter(
        (session) => isFiniteNumber(session.avgHr)
            && isFiniteNumber(session.durationSeconds)
            && session.durationSeconds > 0,
    );

    if (weightedSessions.length > 0) {
        const totalDuration = weightedSessions.reduce(
            (sum, session) => sum + (session.durationSeconds ?? 0),
            0,
        );
        const weightedTotal = weightedSessions.reduce(
            (sum, session) => sum + (session.avgHr ?? 0) * (session.durationSeconds ?? 0),
            0,
        );

        return totalDuration > 0 ? weightedTotal / totalDuration : null;
    }

    const values = sessions
        .map((session) => session.avgHr)
        .filter(isFiniteNumber);

    return values.length > 0
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : null;
}

function computeMaxHr(sessions: readonly WorkoutSession[]): number | null {
    const values = sessions
        .map((session) => session.maxHr)
        .filter(isFiniteNumber);

    return values.length > 0 ? Math.max(...values) : null;
}

function countMedia(sessions: readonly WorkoutSession[]): number {
    return sessions.reduce(
        (total, session) => total + (Array.isArray(session.media) ? session.media.length : 0),
        0,
    );
}

export function buildTrainingDayRows(days: readonly CalendarDayFull[]): TrainingDayRow[] {
    return days.flatMap((day) => {
        const sessions = getSessions(day);
        const summarySessionsCount = day.trainingSummary?.sessionsCount ?? 0;
        const sessionsCount = sessions.length > 0 ? sessions.length : summarySessionsCount;

        if (sessionsCount <= 0) return [];

        return [{
            date: day.date ?? "—",
            sessionsCount,
            durationSeconds: sumNumbers(sessions.map((session) => session.durationSeconds)),
            activeKcal: sumNumbers(sessions.map((session) => session.activeKcal)),
            avgHr: computeAverageHr(sessions),
            maxHr: computeMaxHr(sessions),
            mediaCount: countMedia(sessions),
        }];
    });
}

export function formatWeekDayLabel(dateIso: string, lang: "es" | "en" = "es"): string {
    const date = new Date(`${dateIso}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateIso;

    return new Intl.DateTimeFormat(lang === "es" ? "es-MX" : "en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
    }).format(date);
}
