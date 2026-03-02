import { useLocalSearchParams } from "expo-router";
import React from "react";
import { WeekViewScreen } from "../../../../features/weeklySummary/screens/WeekViewScreen";

export default function SessionDetailRoute() {
    const { weekKey } = useLocalSearchParams<{ weekKey: string }>();

    return <WeekViewScreen weekKey={weekKey ?? ""} />;
}