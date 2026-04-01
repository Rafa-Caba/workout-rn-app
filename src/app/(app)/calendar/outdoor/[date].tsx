// src/app/(app)/calendar/outdoor/[date].tsx

import { useLocalSearchParams } from "expo-router";
import React from "react";

import OutdoorSessionsScreen from "@/src/features/health/outdoor/screens/OutdoorSessionsScreen";
import type { ISODate } from "@/src/types/workoutDay.types";

export default function CalendarOutdoorDateRoute() {
    const params = useLocalSearchParams<{ date?: string }>();

    const date =
        typeof params.date === "string" && params.date.trim().length > 0
            ? (params.date as ISODate)
            : undefined;

    return <OutdoorSessionsScreen key={date ?? "today"} />;
}