// /src/query/queryKeys.ts
// Canonical React Query keys for RN. The literal values preserve the cache
// names already used in production while removing duplicated hand-written keys.

import type { ISODate, WeekKey } from "@/src/types/workoutDay.types";

type QueryParams = Readonly<Record<string, unknown>>;

export const queryKeys = {
    auth: {
        root: ["auth"] as const,
        me: ["auth", "me"] as const,
    },

    settings: {
        root: ["settings"] as const,
        my: ["settings", "me"] as const,
        appPublic: ["appSettings", "public"] as const,
        admin: ["appSettings", "admin"] as const,
    },

    movements: {
        root: ["movements"] as const,
        list: (params?: { activeOnly?: boolean; q?: string }) =>
            ["movements", "list", params ?? {}] as const,
        byId: (id: string) => ["movements", "byId", id] as const,
    },

    workout: {
        dayRoot: ["workoutDay"] as const,
        day: (date: ISODate | string | null) => ["workoutDay", date] as const,
        rangeRoot: ["workoutRange"] as const,
        range: (from: ISODate | string, to: ISODate | string) =>
            ["workoutRange", from, to] as const,
        calendarRoot: ["workoutCalendar"] as const,
        calendar: (params: QueryParams) => ["workoutCalendar", params] as const,
        weekViewRoot: ["workoutWeekView"] as const,
        weekView: (
            weekKey: WeekKey | string | null,
            params: QueryParams | null,
        ) => ["workoutWeekView", weekKey, params] as const,
        statsRoot: ["workoutStats"] as const,
        stats: (from: ISODate | string, to: ISODate | string) =>
            ["workoutStats", from, to] as const,
    },

    bodyMetrics: {
        root: ["bodyMetrics"] as const,
        list: (params: { from?: string; to?: string } = {}) =>
            ["bodyMetrics", "list", params] as const,
        latest: ["bodyMetrics", "latest"] as const,
    },

    bodyProgress: {
        root: ["bodyProgress"] as const,
        overview: (params: QueryParams) =>
            ["bodyProgress", "overview", params] as const,
    },

    progress: {
        root: ["workoutProgressOverview"] as const,
        overview: (params: QueryParams) =>
            ["workoutProgressOverview", params] as const,
    },

    sessions: {
        create: ["sessions", "create"] as const,
        patch: ["sessions", "patch"] as const,
        delete: ["sessions", "delete"] as const,
    },

    media: {
        root: ["media"] as const,
        feed: (params: QueryParams) => ["media", params] as const,
        grouped: (params: QueryParams) => ["media", "grouped", params] as const,
        statsRoot: ["mediaStats"] as const,
        stats: (params: QueryParams) => ["mediaStats", params] as const,
    },

    routines: {
        weekRoot: ["routineWeek"] as const,
        week: (weekKey: WeekKey | string) => ["routineWeek", weekKey] as const,
        listRoot: ["routineWeeksList"] as const,
        list: (status?: string) => ["routineWeeksList", status] as const,
    },

    summary: {
        dayRoot: ["daySummary"] as const,
        day: (date: ISODate | string) => ["daySummary", date] as const,
        weekRoot: ["weekSummary"] as const,
        week: (weekKey: WeekKey | string) => ["weekSummary", weekKey] as const,
        rangeRoot: ["rangeSummary"] as const,
        range: (from: ISODate | string, to: ISODate | string) =>
            ["rangeSummary", from, to] as const,
        weeksTrendRoot: ["weeklyTrends"] as const,
        weeksTrend: (fromWeek: WeekKey | string, toWeek: WeekKey | string) =>
            ["weeklyTrends", fromWeek, toWeek] as const,
        planVsActualRoot: ["planVsActual"] as const,
        planVsActual: (weekKey: WeekKey | string) =>
            ["planVsActual", weekKey] as const,
    },

    insights: {
        root: ["insights"] as const,
        prs: (params: QueryParams) => ["insights", "prs", params] as const,
        streaks: (params: QueryParams) => ["insights", "streaks", params] as const,
        recovery: (from: ISODate | string, to: ISODate | string) =>
            ["insights", "recovery", from, to] as const,
    },

    dashboard: {
        root: ["dashboard"] as const,
        daySummary: (date: ISODate | string) =>
            ["dashboard", "daySummary", date] as const,
        rangeSummary: (from: ISODate | string, to: ISODate | string) =>
            ["dashboard", "rangeSummary", from, to] as const,
        weekSummary: (weekKey: WeekKey | string) =>
            ["dashboard", "weekSummary", weekKey] as const,
        weekTrend: (weekKey: WeekKey | string) =>
            ["dashboard", "weekTrend", weekKey] as const,
        streaks: (mode: string, gapDays: number, asOf: ISODate | string) =>
            ["dashboard", "streaks", mode, gapDays, asOf] as const,
        media: (from: ISODate | string, to: ISODate | string, limit: number) =>
            ["dashboard", "media", from, to, limit] as const,
    },

    trainer: {
        root: ["trainer"] as const,
        trainees: ["trainer", "trainees"] as const,
        traineeDayRoot: (traineeId: string) =>
            ["trainer", "day", traineeId] as const,
        traineeDay: (traineeId: string, date: ISODate | string) =>
            ["trainer", "day", traineeId, date] as const,
        traineeWeekRoot: (traineeId: string) =>
            ["trainer", "weekSummary", traineeId] as const,
        traineeWeek: (
            traineeId: string,
            weekKey: WeekKey | string,
            params?: QueryParams,
        ) => ["trainer", "weekSummary", traineeId, weekKey, params ?? {}] as const,
        recoveryRoot: (traineeId: string) =>
            ["trainer", "recovery", traineeId] as const,
        recovery: (traineeId: string, from: string, to: string) =>
            ["trainer", "recovery", traineeId, from, to] as const,
        coachProfile: (traineeId: string) =>
            ["trainer", "coachProfile", traineeId] as const,
    },

    admin: {
        usersRoot: ["admin", "users"] as const,
        users: (params: QueryParams) => ["admin", "users", params] as const,
        user: (id: string) => ["admin", "user", id] as const,
    },
} as const;
