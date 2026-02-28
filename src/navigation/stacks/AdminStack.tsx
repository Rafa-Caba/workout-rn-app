import { AdminSettingsScreen } from "@/src/features/workout/screens/AdminSettingsScreen";
import { UserDetailScreen } from "@/src/features/workout/screens/UserDetailScreen";
import { UsersListScreen } from "@/src/features/workout/screens/UsersListScreen";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

export type AdminStackParamList = {
    UsersList: undefined;
    UserDetail: { userId: string };
    AdminSettings: undefined;
};

const Stack = createNativeStackNavigator<AdminStackParamList>();

export function AdminStackNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerTitleAlign: "center" }}>
            <Stack.Screen name="UsersList" component={UsersListScreen} options={{ title: "Usuarios" }} />
            <Stack.Screen name="UserDetail" component={UserDetailScreen} options={{ title: "Detalle" }} />
            <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} options={{ title: "Settings" }} />
        </Stack.Navigator>
    );
}