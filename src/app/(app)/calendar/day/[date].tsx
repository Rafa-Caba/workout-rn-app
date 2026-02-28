import { useLocalSearchParams } from "expo-router";
import React from "react";
import { DayDetailScreen } from "../../../../features/workout/screens/DayDetailScreen";

export default function DayDetailRoute() {
    const { date } = useLocalSearchParams<{ date: string }>();

    return <DayDetailScreen date={date ?? ""} />;
}