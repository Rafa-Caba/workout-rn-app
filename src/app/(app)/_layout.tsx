// src/app/(app)/_layout.tsx
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuthStore } from "@/src/store/auth.store";
import { useTheme } from "@/src/theme/ThemeProvider";
import { getBottomTabsScreenOptions } from "@/src/theme/navigation";

type MciName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

function tabIcon(name: MciName) {
    return ({ color, size }: { color: string; size: number }) => (
        <MaterialCommunityIcons name={name} size={size} color={color} />
    );
}

export default function AppLayout() {
    const user = useAuthStore((s) => s.user);
    const isTrainer = user?.coachMode === "TRAINER";
    const isAdmin = user?.role === "admin";

    const theme = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <Tabs
            screenOptions={{
                ...getBottomTabsScreenOptions(theme, insets.bottom),
                tabBarLabelStyle: { fontWeight: "600", fontSize: 9 },
            }}
        >
            <Tabs.Screen name="dashboard" options={{ title: "Dashboard", tabBarIcon: tabIcon("cat") }} />
            <Tabs.Screen name="calendar" options={{ title: "Calendario", tabBarIcon: tabIcon("calendar-month-outline") }} />
            <Tabs.Screen name="movements" options={{ title: "Ejercicios", tabBarIcon: tabIcon("dumbbell") }} />
            <Tabs.Screen name="sleep" options={{ title: "Sueño", tabBarIcon: tabIcon("bed-clock") }} />
            <Tabs.Screen name="media" options={{ title: "Media", tabBarIcon: tabIcon("image-multiple-outline") }} />
            <Tabs.Screen name="trends" options={{ title: "Tendencias (Semanas)", tabBarIcon: tabIcon("trending-up") }} />
            <Tabs.Screen name="insights" options={{ title: "Insights", tabBarIcon: tabIcon("chart-line") }} />
            {/* <Tabs.Screen name="settings" options={{ title: "Ajustes", tabBarIcon: tabIcon("coffee-outline") }} /> */}

            {isTrainer ? (
                <Tabs.Screen name="trainer" options={{ title: "Trainer", tabBarIcon: tabIcon("whistle-outline") }} />
            ) : null}

            {isAdmin ? (
                <Tabs.Screen name="admin" options={{ title: "Admin", tabBarIcon: tabIcon("shield-crown-outline") }} />
            ) : null}

            {/* Hide non-tab routes from the bottom bar */}
            <Tabs.Screen name="me" options={{ title: "Perfil", tabBarIcon: tabIcon("face-man-outline"), href: null }} />
        </Tabs>
    );
}