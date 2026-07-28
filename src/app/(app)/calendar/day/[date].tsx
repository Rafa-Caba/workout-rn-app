// src/app/(app)/calendar/day/[date].tsx

/**
 * Route wrapper for the unified day detail.
 * It validates the ISO route parameter and exposes a Spanish header title.
 */

import { DayDetailScreen } from "@/src/features/daySummary/screens/DayDetailScreen";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Stack, useLocalSearchParams } from "expo-router";
import React from "react";

function safeParseIsoDate(isoDate: string): Date | null {
    if (!isoDate) return null;

    const parsed = new Date(`${isoDate}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatHeaderTitle(isoDate: string): string {
    const parsed = safeParseIsoDate(isoDate);
    if (!parsed) return "Día";

    return format(parsed, "d MMM yyyy", { locale: es });
}

export default function DayDetailRoute() {
    const { date } = useLocalSearchParams<{ date: string }>();
    const isoDate = date ?? "";

    return (
        <>
            <Stack.Screen options={{ title: formatHeaderTitle(isoDate) }} />
            <DayDetailScreen date={isoDate} />
        </>
    );
}
