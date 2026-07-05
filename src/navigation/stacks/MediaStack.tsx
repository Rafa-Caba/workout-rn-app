import { MediaExploreScreen } from "@/src/features/media/screens/MediaExploreScreen";
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
            <Stack.Screen name="MediaFeed" component={MediaExploreScreen} options={{ title: "Media" }} />
        </Stack.Navigator>
    );
}