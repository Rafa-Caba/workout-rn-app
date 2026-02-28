import { MediaFeedScreen } from "@/src/features/media/screens/MediaFeedScreen";
import { MediaGroupedScreen } from "@/src/features/media/screens/MediaGroupedScreen";
import { SessionMediaScreen } from "@/src/features/media/screens/SessionMediaScreen";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

export type MediaStackParamList = {
    MediaFeed: undefined;
    MediaGrouped: undefined;
    SessionMedia: { sessionId: string };
};

const Stack = createNativeStackNavigator<MediaStackParamList>();

export function MediaStackNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerTitleAlign: "center" }}>
            <Stack.Screen name="MediaFeed" component={MediaFeedScreen} options={{ title: "Media" }} />
            <Stack.Screen name="MediaGrouped" component={MediaGroupedScreen} options={{ title: "Por sesión" }} />
            <Stack.Screen name="SessionMedia" component={SessionMediaScreen} options={{ title: "Adjuntos" }} />
        </Stack.Navigator>
    );
}