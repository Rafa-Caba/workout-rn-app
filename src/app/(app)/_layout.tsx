// src/app/(app)/_layout.tsx
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs, router, type Href } from "expo-router";
import React from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
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

type MoreItem = {
    key: string;
    title: string;
    icon: MciName;
    href: Href;
};

export default function AppLayout() {
    const user = useAuthStore((s) => s.user);

    const isAdmin = user?.role === "admin";
    const isTrainer = user?.coachMode === "TRAINER";

    const theme = useTheme();
    const { colors } = theme;
    const insets = useSafeAreaInsets();

    const [moreOpen, setMoreOpen] = React.useState(false);

    const moreItems: MoreItem[] = React.useMemo(() => {
        const list: MoreItem[] = [
            { key: "media", title: "Media", icon: "image-multiple-outline", href: "/media" },
            { key: "trends", title: "Tendencias (Semanas)", icon: "trending-up", href: "/trends" },
            { key: "insights", title: "Insights", icon: "chart-bell-curve", href: "/insights" },
            { key: "pva", title: "Plan vs Real", icon: "chart-box-multiple", href: "/pva" },
            { key: "me", title: "Perfil", icon: "face-man-outline", href: "/me" },
        ];

        return list;
    }, []);

    const openMore = React.useCallback(() => setMoreOpen(true), []);
    const closeMore = React.useCallback(() => setMoreOpen(false), []);

    const goTo = React.useCallback((href: Href) => {
        setMoreOpen(false);
        router.push(href);
    }, []);

    const trainerTabOptions = React.useMemo(() => {
        if (isTrainer) {
            return { title: "Trainer", tabBarIcon: tabIcon("whistle-outline") };
        }
        return {
            href: null,
        };
    }, [isTrainer]);

    const adminTabOptions = React.useMemo(() => {
        if (isAdmin) {
            return { title: "Admin", tabBarIcon: tabIcon("shield-crown-outline") };
        }
        return {
            href: null,
        };
    }, [isAdmin]);

    return (
        <>
            <Tabs
                screenOptions={{
                    ...getBottomTabsScreenOptions(theme, insets.bottom),
                    tabBarLabelStyle: { fontWeight: "600", fontSize: 8 },
                }}
            >
                {/* FIXED */}
                <Tabs.Screen name="dashboard" options={{ title: "Dashboard", tabBarIcon: tabIcon("cat") }} />
                <Tabs.Screen name="calendar" options={{ title: "Calendario", tabBarIcon: tabIcon("calendar-month-outline") }} />
                <Tabs.Screen name="movements" options={{ title: "Ejercicios", tabBarIcon: tabIcon("dumbbell") }} />
                <Tabs.Screen name="sleep" options={{ title: "Sueño", tabBarIcon: tabIcon("bed-clock") }} />

                {/* These are FIXED when allowed, fully hidden when not */}
                <Tabs.Screen name="trainer" options={trainerTabOptions as any} />
                <Tabs.Screen name="admin" options={adminTabOptions as any} />

                {/* "Más" */}
                <Tabs.Screen
                    name="more"
                    options={{ title: "Más", tabBarIcon: tabIcon("dots-horizontal") }}
                    listeners={{
                        tabPress: (e) => {
                            e.preventDefault();
                            openMore();
                        },
                    }}
                />

                {/* NOT FIXED (hidden from tab bar, reachable via "Más") */}
                <Tabs.Screen name="media" options={{ href: null }} />
                <Tabs.Screen name="trends" options={{ href: null }} />
                <Tabs.Screen name="insights" options={{ href: null }} />
                <Tabs.Screen name="pva" options={{ href: null }} />

                {/* Hide non-tab routes from the bottom bar */}
                <Tabs.Screen name="me" options={{ href: null }} />
            </Tabs>

            {/* =========================
               More Modal
               ========================= */}
            <Modal visible={moreOpen} animationType="slide" transparent onRequestClose={closeMore}>
                <View
                    style={{
                        flex: 1,
                        backgroundColor: "rgba(0,0,0,0.35)",
                        padding: 16,
                        justifyContent: "flex-end",
                    }}
                >
                    <View
                        style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.surface,
                            borderRadius: 18,
                            padding: 14,
                            paddingBottom: 10,
                            maxHeight: "72%",
                        }}
                    >
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontWeight: "900", color: colors.text, fontSize: 16 }}>Más</Text>
                                <Text style={{ color: colors.mutedText, fontWeight: "700", fontSize: 12 }}>
                                    Navega a secciones extra.
                                </Text>
                            </View>

                            <Pressable
                                onPress={closeMore}
                                style={({ pressed }) => ({
                                    paddingHorizontal: 12,
                                    paddingVertical: 10,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    backgroundColor: colors.background,
                                    opacity: pressed ? 0.92 : 1,
                                })}
                            >
                                <Text style={{ fontWeight: "900", color: colors.text }}>Cerrar</Text>
                            </Pressable>
                        </View>

                        <View style={{ height: 12 }} />

                        <ScrollView>
                            <View style={{ gap: 10 }}>
                                {moreItems.map((it) => (
                                    <Pressable
                                        key={it.key}
                                        onPress={() => goTo(it.href)}
                                        style={({ pressed }) => ({
                                            borderWidth: 1,
                                            borderColor: colors.border,
                                            backgroundColor: colors.background,
                                            borderRadius: 14,
                                            paddingHorizontal: 12,
                                            paddingVertical: 12,
                                            opacity: pressed ? 0.92 : 1,
                                            flexDirection: "row",
                                            alignItems: "center",
                                            gap: 10,
                                        })}
                                    >
                                        <MaterialCommunityIcons name={it.icon} size={20} color={colors.text} />
                                        <Text style={{ color: colors.text, fontWeight: "900", flex: 1 }} numberOfLines={1}>
                                            {it.title}
                                        </Text>
                                        <Text style={{ color: colors.mutedText, fontWeight: "900" }}>›</Text>
                                    </Pressable>
                                ))}
                            </View>
                        </ScrollView>

                        <View style={{ height: 10 }} />
                    </View>
                </View>
            </Modal>
        </>
    );
}