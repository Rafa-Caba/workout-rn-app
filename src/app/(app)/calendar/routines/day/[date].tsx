import { RoutinesDayScreen } from "@/src/features/routines/screens/RoutinesDayScreen";
import { useLocalSearchParams } from "expo-router";
import React from "react";

export default function RoutinesDayRoute() {
    const { date } = useLocalSearchParams<{ date: string }>();
    return <RoutinesDayScreen date={date ?? ""} />;
}