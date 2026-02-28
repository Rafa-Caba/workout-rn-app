import { GymCheckDayRouteScreen } from "@/src/features/gymCheck/screens/GymCheckDayRouteScreen";
import { useLocalSearchParams } from "expo-router";
import React from "react";

export default function GymCheckDayRoute() {
    const { date } = useLocalSearchParams<{ date: string }>();
    return <GymCheckDayRouteScreen date={date ?? ""} />;
}