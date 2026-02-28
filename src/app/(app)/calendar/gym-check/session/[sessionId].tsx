import { useLocalSearchParams } from "expo-router";
import React from "react";

import { GymCheckSessionScreen } from "@/src/features/gymCheck/screens/GymCheckSessionScreen";

export default function GymCheckSessionRoute() {
    // Keep param for the route, but GymCheckSessionScreen doesn't take it as a prop.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

    return <GymCheckSessionScreen />;
}