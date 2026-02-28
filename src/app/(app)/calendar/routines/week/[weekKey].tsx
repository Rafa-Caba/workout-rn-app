import { RoutinesWeekScreen } from "@/src/features/routines/screens/RoutinesWeekScreen";
import { useLocalSearchParams } from "expo-router";
import React from "react";

export default function RoutinesWeekRoute() {
    const { weekKey } = useLocalSearchParams<{ weekKey: string }>();
    return <RoutinesWeekScreen weekKey={weekKey ?? ""} />;
}