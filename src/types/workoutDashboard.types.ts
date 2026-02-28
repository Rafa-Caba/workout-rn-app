export type ISODate = string; // "YYYY-MM-DD"
export type WeekKey = string; // "YYYY-W##"

export type Range = { from: ISODate; to: ISODate };

export type SummarySleep = {
    daysWithSleep: number;
    avgTotalMinutes: number | null;
    avgDeepMinutes: number | null;
    avgRemMinutes: number | null;
    avgScore: number | null;
};

export type SummaryTrainingBySessionType = {
    sessionType: string;
    sessionsCount: number;
    durationSeconds: number;
    activeKcal: number | null;
};

export type SummaryTrainingTotals = {
    sessionsCount: number;
    durationSeconds: number;
    activeKcal: number | null;
    totalKcal: number | null;
    avgHr: number | null;
    maxHr: number | null;
    distanceKm: number | null;
    steps: number | null;
    mediaCount: number;
    bySessionType?: SummaryTrainingBySessionType[];
};

export type RangeSummaryResponse = {
    range: Range;
    daysCount: number;
    sleep: SummarySleep;
    training: SummaryTrainingTotals;
    mediaCount: number;
};

/**
 * Your API returns sleep: null in many cases.
 * Keep this flexible and only render the fields we need.
 */
export type DaySummaryResponse = {
    date: ISODate;
    weekKey: WeekKey | null;
    sleep:
    | {
        totalMinutes?: number | null;
        deepMinutes?: number | null;
        remMinutes?: number | null;
        score?: number | null;
        [k: string]: unknown;
    }
    | null;
    training: Omit<SummaryTrainingTotals, "bySessionType">;
    notes: string | null;
    tags: string[] | null;
};

export type WeekSummaryResponse = {
    weekKey: WeekKey;
    range: Range;
    daysCount: number;
    sleep: SummarySleep;
    training: SummaryTrainingTotals;
    mediaCount: number;
};

export type WeekTrendPoint = {
    weekKey: WeekKey;
    range: Range;
    daysCount: number;
    sleep: SummarySleep;
    training: {
        sessionsCount: number;
        durationSeconds: number;
        activeKcal: number | null;
        avgHr: number | null;
        maxHr: number | null;
    };
    mediaCount: number;
};

export type WeeksTrendResponse = {
    fromWeek: WeekKey;
    toWeek: WeekKey;
    points: WeekTrendPoint[];
};

export type StreaksResponse = {
    asOf: ISODate;
    mode: "training" | "sleep" | "both";
    gapDays: number;
    currentStreakDays: number;
    longestStreakDays: number;
    lastQualifiedDate: ISODate | null;
};

/* =========================================================
   Media Feed (UPDATED to match /workout/media response)
   ========================================================= */

export type MediaResourceType = "image" | "video";
export type MediaSource = "day" | "routine";

export type MediaFeedItem = {
    source: MediaSource;

    // media
    publicId: string;
    url: string;
    resourceType: MediaResourceType;
    format: string | null;
    createdAt: string; // ISO datetime string
    meta: Record<string, unknown> | null;

    // context
    date: ISODate | null; // null for routine attachments
    weekKey: WeekKey;

    sessionId: string | null; // null for routine attachments
    sessionType: string;

    dayNotes: string | null;
    dayTags: string[] | null;
};

export type MediaFeedResponse = {
    filters: {
        source: "day" | "routine" | "all";

        from: ISODate | null;
        to: ISODate | null;
        date: ISODate | null;
        weekKey: WeekKey | null;

        sessionId: string | null;
        resourceType: MediaResourceType | null;
    };
    limit: number;
    cursor: string | null;
    nextCursor: string | null;
    items: MediaFeedItem[];
};
