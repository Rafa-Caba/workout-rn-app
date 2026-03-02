// src/app/(app)/calendar/day/[date].tsx
import { DayDetailScreen } from "@/src/features/daySummary/screens/DayDetailScreen";
import { format } from "date-fns";
import { Stack, useLocalSearchParams } from "expo-router";
import React from "react";

function safeParseIsoDate(isoDate: string): Date | null {
    if (!isoDate) return null;
    const dt = new Date(`${isoDate}T00:00:00`);
    if (Number.isNaN(dt.getTime())) return null;
    return dt;
}

function formatHeaderTitle(isoDate: string): string {
    const dt = safeParseIsoDate(isoDate);
    if (!dt) return "Día";
    // Example: "Día • Feb 28, 2026"
    return `${format(dt, "MMM dd, yyyy")}`;
}

export default function DayDetailRoute() {
    const { date } = useLocalSearchParams<{ date: string }>();
    const iso = date ?? "";

    return (
        <>
            <Stack.Screen options={{ title: formatHeaderTitle(iso) }} />
            <DayDetailScreen date={iso} />
        </>
    );
}