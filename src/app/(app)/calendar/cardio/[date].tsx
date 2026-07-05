// src/app/(app)/calendar/cardio/[date].tsx

import { useLocalSearchParams } from "expo-router";
import React from "react";

import CardioSessionsScreen from "@/src/features/health/cardio/screens/CardioSessionsScreen";
import type { ISODate } from "@/src/types/workoutDay.types";

export default function CalendarCardioDateRoute() {
    const params = useLocalSearchParams<{ date?: string }>();

    const date =
        typeof params.date === "string" && params.date.trim().length > 0
            ? (params.date as ISODate)
            : undefined;

    return <CardioSessionsScreen key={date ?? "today"} />;
}
