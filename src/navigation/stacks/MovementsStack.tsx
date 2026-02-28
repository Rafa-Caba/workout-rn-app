import { MovementDetailScreen } from "@/src/features/movements/screens/MovementDetailScreen";
import { MovementsListScreen } from "@/src/features/movements/screens/MovementsListScreen";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

export type MovementsStackParamList = {
    MovementsList: undefined;
    MovementDetail: { movementId: string };
};

const Stack = createNativeStackNavigator<MovementsStackParamList>();

export function MovementsStackNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerTitleAlign: "center" }}>
            <Stack.Screen name="MovementsList" component={MovementsListScreen} options={{ title: "Movimientos" }} />
            <Stack.Screen name="MovementDetail" component={MovementDetailScreen} options={{ title: "Detalle" }} />
        </Stack.Navigator>
    );
}