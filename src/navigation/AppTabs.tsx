import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";

import { useAuthStore } from "../store/auth.store";
import { AdminStackNavigator } from "./stacks/AdminStack";
import { CalendarStackNavigator } from "./stacks/CalendarStack";
import { InsightsStackNavigator } from "./stacks/InsightsStack";
import { MediaStackNavigator } from "./stacks/MediaStack";
import { MovementsStackNavigator } from "./stacks/MovementsStack";
import { TrainerStackNavigator } from "./stacks/TrainerStack";
import { TrendsStackNavigator } from "./stacks/TrendsStack";

export type AppTabsParamList = {
    CalendarTab: undefined;
    MovementsTab: undefined;
    MediaTab: undefined;
    InsightsTab: undefined;
    TrendsTab: undefined;
    TrainerTab: undefined;
    AdminTab: undefined;
};

const Tab = createBottomTabNavigator<AppTabsParamList>();

export function AppTabsNavigator() {
    const user = useAuthStore((s) => s.user);

    const isTrainer = user?.coachMode === "TRAINER";
    const isAdmin = user?.role === "admin";

    return (
        <Tab.Navigator screenOptions={{ headerShown: false }}>
            <Tab.Screen name="CalendarTab" component={CalendarStackNavigator} options={{ title: "Calendario" }} />
            <Tab.Screen name="MovementsTab" component={MovementsStackNavigator} options={{ title: "Movimientos" }} />
            <Tab.Screen name="MediaTab" component={MediaStackNavigator} options={{ title: "Media" }} />
            <Tab.Screen name="TrendsTab" component={TrendsStackNavigator} options={{ title: "Insights" }} />
            <Tab.Screen name="InsightsTab" component={InsightsStackNavigator} options={{ title: "Insights" }} />

            {isTrainer ? (
                <Tab.Screen name="TrainerTab" component={TrainerStackNavigator} options={{ title: "Trainer" }} />
            ) : null}

            {isAdmin ? (
                <Tab.Screen name="AdminTab" component={AdminStackNavigator} options={{ title: "Admin" }} />
            ) : null}
        </Tab.Navigator>
    );
}