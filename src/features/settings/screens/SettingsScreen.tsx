// /src/features/settings/screens/SettingsScreen.tsx
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React from "react";
import { Button, Text, View } from "react-native";

import { useAuthStore } from "@/src/store/auth.store";

export default function SettingsScreen() {
    const router = useRouter();

    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);

    const logoutMutation = useMutation({
        mutationFn: () => logout(),
    });

    const onLogout = async () => {
        try {
            await logoutMutation.mutateAsync();
        } finally {
            router.replace("/(auth)/login");
        }
    };

    return (
        <View style={{ flex: 1, padding: 16, gap: 12 }}>
            <Text style={{ fontSize: 22, fontWeight: "700" }}>Ajustes</Text>

            <Text>Usuario: {user?.name ?? "-"}</Text>
            <Text>Email: {user?.email ?? "-"}</Text>

            <Button
                title={logoutMutation.isPending ? "Cerrando sesión..." : "Cerrar sesión"}
                onPress={onLogout}
                disabled={logoutMutation.isPending}
            />
        </View>
    );
}