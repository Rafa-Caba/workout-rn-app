// src/app/(app)/calendar/routines/index.tsx

import { getISOWeek, getISOWeekYear } from "date-fns";
import { Redirect } from "expo-router";
import React from "react";

function pad2(value: number): string {
    return value < 10 ? `0${value}` : `${value}`;
}

function getCurrentWeekKey(): string {
    const today = new Date();
    const year = getISOWeekYear(today);
    const week = getISOWeek(today);

    return `${year}-W${pad2(week)}`;
}

export default function RoutinesIndexRoute() {
    const weekKey = getCurrentWeekKey();

    return <Redirect href={`/(app)/calendar/routines/week/${weekKey}`} />;
}