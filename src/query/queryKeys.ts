// src/query/queryKeys.ts
import type { ISODate, WeekKey } from "../types/workoutDay.types";

export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },

  settings: {
    my: ["settings", "me"] as const,
    appPublic: ["appSettings", "public"] as const,
    admin: ["appSettings", "admin"] as const,
  },

  movements: {
    list: (params?: { activeOnly?: boolean; q?: string }) =>
      ["movements", "list", params ?? {}] as const,
    byId: (id: string) => ["movements", "byId", id] as const,
  },

  workout: {
    day: (date: ISODate) => ["workout", "day", date] as const,
    range: (from: ISODate, to: ISODate) => ["workout", "range", from, to] as const,
    calendar: (params: Record<string, unknown>) => ["workout", "calendar", params] as const,
    weekView: (weekKey: WeekKey, params: Record<string, unknown>) =>
      ["workout", "weekView", weekKey, params] as const,
    stats: (from: ISODate, to: ISODate) => ["workout", "stats", from, to] as const,
  },

  bodyMetrics: {
    list: (params: { from?: string; to?: string } = {}) =>
      ["bodyMetrics", "list", params] as const,
    latest: ["bodyMetrics", "latest"] as const,
  },

  bodyProgress: {
    overview: (params: Record<string, unknown>) =>
      ["bodyProgress", "overview", params] as const,
  },

  sessions: {
    create: ["sessions", "create"] as const,
    patch: ["sessions", "patch"] as const,
    delete: ["sessions", "delete"] as const,
  },

  media: {
    feed: (params: Record<string, unknown>) => ["media", "feed", params] as const,
    grouped: (params: Record<string, unknown>) => ["media", "grouped", params] as const,
  },

  routines: {
    week: (weekKey: WeekKey) => ["routines", "week", weekKey] as const,
    list: (params: Record<string, unknown>) => ["routines", "list", params] as const,
  },

  summary: {
    day: (date: ISODate) => ["summary", "day", date] as const,
    week: (weekKey: WeekKey) => ["summary", "week", weekKey] as const,
    range: (from: ISODate, to: ISODate) => ["summary", "range", from, to] as const,
    weeksTrend: (params: Record<string, unknown>) => ["summary", "weeksTrend", params] as const,
    planVsActual: (weekKey: WeekKey) => ["summary", "planVsActual", weekKey] as const,
    mediaStats: (params: Record<string, unknown>) => ["summary", "mediaStats", params] as const,
  },

  insights: {
    prs: (params: Record<string, unknown>) => ["insights", "prs", params] as const,
    streaks: (params: Record<string, unknown>) => ["insights", "streaks", params] as const,
    recovery: (from: ISODate, to: ISODate) => ["insights", "recovery", from, to] as const,
  },

  trainer: {
    trainees: ["trainer", "trainees"] as const,
    traineeDay: (traineeId: string, date: ISODate) => ["trainer", "traineeDay", traineeId, date] as const,
    traineeWeek: (traineeId: string, weekKey: WeekKey, params: Record<string, unknown>) =>
      ["trainer", "traineeWeek", traineeId, weekKey, params] as const,
    traineeProfile: (traineeId: string) => ["trainer", "traineeProfile", traineeId] as const,
  },

  admin: {
    users: (params: Record<string, unknown>) => ["admin", "users", params] as const,
    user: (id: string) => ["admin", "user", id] as const,
  },
} as const;