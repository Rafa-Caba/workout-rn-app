// src/app/(auth)/_layout.tsx
import { Stack } from "expo-router";
import React from "react";

import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AuthLayout() {
    const insets = useSafeAreaInsets();

    // tabBarStyle: {
    // paddingTop: insets.top,
    return (
        <Stack>
            <Stack.Screen name="login" options={{ title: "Iniciar sesión" }} />
            <Stack.Screen name="register" options={{ title: "Crear cuenta" }} />
        </Stack>
    );
}