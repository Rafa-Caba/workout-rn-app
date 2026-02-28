import { PRsScreen } from "@/src/features/workout/screens/PRsScreen";
import { RecoveryScreen } from "@/src/features/workout/screens/RecoveryScreen";
import { StreaksScreen } from "@/src/features/workout/screens/StreaksScreen";
import { SummaryRangeScreen } from "@/src/features/workout/screens/SummaryRangeScreen";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

export type InsightsStackParamList = {
    SummaryRange: undefined;
    PRs: undefined;
    Streaks: undefined;
    Recovery: undefined;
};

const Stack = createNativeStackNavigator<InsightsStackParamList>();

export function InsightsStackNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerTitleAlign: "center" }}>
            <Stack.Screen name="SummaryRange" component={SummaryRangeScreen} options={{ title: "Resumen" }} />
            <Stack.Screen name="PRs" component={PRsScreen} options={{ title: "PRs" }} />
            <Stack.Screen name="Streaks" component={StreaksScreen} options={{ title: "Rachas" }} />
            <Stack.Screen name="Recovery" component={RecoveryScreen} options={{ title: "Recuperación" }} />
        </Stack.Navigator>
    );
}