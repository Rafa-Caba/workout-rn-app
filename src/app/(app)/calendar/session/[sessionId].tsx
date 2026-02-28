import { useLocalSearchParams } from "expo-router";
import React from "react";
import { SessionDetailScreen } from "../../../../features/workout/screens/SessionDetailScreen";

export default function SessionDetailRoute() {
    const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

    return <SessionDetailScreen sessionId={sessionId ?? ""} />;
}