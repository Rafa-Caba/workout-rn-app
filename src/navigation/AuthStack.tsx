import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import LoginScreen from "../app/(auth)/login";
import RegisterScreen from "../app/(auth)/register";

export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStackNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerTitleAlign: "center" }}>
            <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Iniciar sesión" }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: "Crear cuenta" }} />
        </Stack.Navigator>
    );
}