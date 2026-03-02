// src/navigation/stacks/CalendarStack.tsx
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

import { DayDetailScreen } from "@/src/features/daySummary/screens/DayDetailScreen";
import { WeekViewScreen } from "@/src/features/weeklySummary/screens/WeekViewScreen";
import { CalendarMonthScreen } from "@/src/features/workout/screens/CalendarMonthScreen";

export type CalendarStackParamList = {
    CalendarMonth: undefined;

    // Week summary needs the key
    WeekView: { weekKey: string };

    // Day detail expects ISO date (yyyy-MM-dd)
    DayDetail: { date: string };
};

const Stack = createNativeStackNavigator<CalendarStackParamList>();

export function CalendarStackNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerTitleAlign: "center" }}>
            <Stack.Screen
                name="CalendarMonth"
                component={CalendarMonthScreen}
                options={{ title: "Calendario" }}
            />

            <Stack.Screen
                name="WeekView"
                component={WeekViewRouteShim}
                options={{ title: "Resumen Semanal" }}
            />

            <Stack.Screen
                name="DayDetail"
                component={DayDetailRouteShim}
                options={{ title: "Día" }}
            />
        </Stack.Navigator>
    );
}

/**
 * We keep WeekViewScreen's contract: props = { weekKey: string }
 * React Navigation gives route params, so we adapt here.
 */
function WeekViewRouteShim({ route }: { route: { params: CalendarStackParamList["WeekView"] } }) {
    return <WeekViewScreen weekKey={route.params.weekKey} />;
}

/**
 * DayDetailScreen contract: props = { date: string }
 * (ISO date string: yyyy-MM-dd)
 */
function DayDetailRouteShim({ route }: { route: { params: CalendarStackParamList["DayDetail"] } }) {
    return <DayDetailScreen date={route.params.date} />;
}