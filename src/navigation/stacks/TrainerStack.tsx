import { PlannedRoutineEditorScreen } from "@/src/features/workout/screens/PlannedRoutineEditorScreen";
import { TraineeDayScreen } from "@/src/features/workout/screens/TraineeDayScreen";
import { TraineesListScreen } from "@/src/features/workout/screens/TraineesListScreen";
import { TraineeWeekSummaryScreen } from "@/src/features/workout/screens/TraineeWeekSummaryScreen";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";


export type TrainerStackParamList = {
    TraineesList: undefined;
    TraineeDay: { traineeId: string; dateIso: string };
    TraineeWeekSummary: { traineeId: string; weekKey: string };
    PlannedRoutineEditor: { traineeId: string; weekKey: string };
};

const Stack = createNativeStackNavigator<TrainerStackParamList>();

export function TrainerStackNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerTitleAlign: "center" }}>
            <Stack.Screen name="TraineesList" component={TraineesListScreen} options={{ title: "Trainees" }} />
            <Stack.Screen name="TraineeDay" component={TraineeDayScreen} options={{ title: "Día" }} />
            <Stack.Screen name="TraineeWeekSummary" component={TraineeWeekSummaryScreen} options={{ title: "Semana" }} />
            <Stack.Screen name="PlannedRoutineEditor" component={PlannedRoutineEditorScreen} options={{ title: "Rutina" }} />
        </Stack.Navigator>
    );
}