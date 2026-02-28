import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";

import { useAuthStore } from "../store/useAuthStore";
import { AdminStackNavigator } from "./stacks/AdminStack";
import { CalendarStackNavigator } from "./stacks/CalendarStack";
import { InsightsStackNavigator } from "./stacks/InsightsStack";
import { MediaStackNavigator } from "./stacks/MediaStack";
import { MovementsStackNavigator } from "./stacks/MovementsStack";
import { SettingsStackNavigator } from "./stacks/SettingsStack";
import { TrainerStackNavigator } from "./stacks/TrainerStack";

export type AppTabsParamList = {
    CalendarTab: undefined;
    MovementsTab: undefined;
    MediaTab: undefined;
    InsightsTab: undefined;
    SettingsTab: undefined;
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
            <Tab.Screen name="InsightsTab" component={InsightsStackNavigator} options={{ title: "Insights" }} />
            <Tab.Screen name="SettingsTab" component={SettingsStackNavigator} options={{ title: "Ajustes" }} />

            {isTrainer ? (
                <Tab.Screen name="TrainerTab" component={TrainerStackNavigator} options={{ title: "Trainer" }} />
            ) : null}

            {isAdmin ? (
                <Tab.Screen name="AdminTab" component={AdminStackNavigator} options={{ title: "Admin" }} />
            ) : null}
        </Tab.Navigator>
    );
}