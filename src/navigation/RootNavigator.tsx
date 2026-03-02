// src/navigation/RootNavigator.tsx
import React from "react";
import { ActivityIndicator, View } from "react-native";

import { useAuthStore } from "../store/auth.store";
import { AppTabsNavigator } from "./AppTabs";
import { AuthStackNavigator } from "./AuthStack";

export function RootNavigator() {
    const status = useAuthStore((s) => s.status);
    const rehydrate = useAuthStore((s) => s.rehydrate);

    React.useEffect(() => {
        rehydrate().catch(() => {
            // handled inside store
        });
    }, [rehydrate]);

    if (status === "idle" || status === "booting") {
        return (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator />
            </View>
        );
    }

    if (status === "authenticated") return <AppTabsNavigator />;
    return <AuthStackNavigator />;
}