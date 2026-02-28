import { PreferencesScreen } from "@/src/features/auth/screens/PreferencesScreen";
import { ProfileScreen } from "@/src/features/auth/screens/ProfileScreen";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

export type SettingsStackParamList = {
    Profile: undefined;
    Preferences: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsStackNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerTitleAlign: "center" }}>
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Mi perfil" }} />
            <Stack.Screen name="Preferences" component={PreferencesScreen} options={{ title: "Preferencias" }} />
        </Stack.Navigator>
    );
}