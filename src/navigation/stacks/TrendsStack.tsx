import { WeeklyTrendsScreen } from "@/src/features/trends/screens/WeeklyTrendsScreen";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

export type InsightsStackParamList = {
    WeeklyTrendsScreen: undefined;
};

const Stack = createNativeStackNavigator<InsightsStackParamList>();

export function TrendsStackNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerTitleAlign: "center" }}>
            <Stack.Screen name="WeeklyTrendsScreen" component={WeeklyTrendsScreen} options={{ title: "Resumen" }} />
        </Stack.Navigator>
    );
}