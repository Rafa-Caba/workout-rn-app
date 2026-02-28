import { CalendarMonthScreen } from "@/src/features/workout/screens/CalendarMonthScreen";
import { DayDetailScreen } from "@/src/features/workout/screens/DayDetailScreen";
import { ExerciseEditorScreen } from "@/src/features/workout/screens/ExerciseEditorScreen";
import { SessionDetailScreen } from "@/src/features/workout/screens/SessionDetailScreen";
import { WeekViewScreen } from "@/src/features/workout/screens/WeekViewScreen";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

export type CalendarStackParamList = {
    CalendarMonth: undefined;
    WeekView: undefined;
    DayDetail: { dateIso: string };
    SessionDetail: { sessionId: string };
    ExerciseEditor: { sessionId: string; exerciseId?: string };
};

const Stack = createNativeStackNavigator<CalendarStackParamList>();

export function CalendarStackNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerTitleAlign: "center" }}>
            <Stack.Screen name="CalendarMonth" component={CalendarMonthScreen} options={{ title: "Calendario" }} />
            <Stack.Screen name="WeekView" component={WeekViewScreen} options={{ title: "Semana" }} />
            <Stack.Screen name="DayDetail" component={DayDetailScreen} options={{ title: "Día" }} />
            <Stack.Screen name="SessionDetail" component={SessionDetailScreen} options={{ title: "Sesión" }} />
            <Stack.Screen name="ExerciseEditor" component={ExerciseEditorScreen} options={{ title: "Ejercicio" }} />
        </Stack.Navigator>
    );
}