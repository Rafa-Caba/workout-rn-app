export type MediaResourceType = "image" | "video";
export type MediaSource = "day" | "routine" | "adminSettings";

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
    date: string | null; // null for routine attachments
    weekKey: string; // YYYY-W##

    sessionId: string | null; // null for routine attachments
    sessionType: string;

    dayNotes: string | null;
    dayTags: string[] | null;
};

export type MediaFeedResponse = {
    filters: {
        source: "day" | "routine" | "all";

        from: string | null;
        to: string | null;
        date: string | null;
        weekKey: string | null;

        sessionId: string | null;
        resourceType: MediaResourceType | null;
    };
    limit: number;
    cursor: string | null;
    nextCursor: string | null;
    items: MediaFeedItem[];
};

export type MediaStatsResponse = {
    range: { from: string; to: string };
    totals: { items: number; images: number; videos: number };
    byDay: Array<{ date: string; items: number; images: number; videos: number }>;
};
