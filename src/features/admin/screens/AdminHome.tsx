// src/features/admin/screens/AdminHome.tsx
import { useRouter, type Href } from "expo-router";
import React from "react";
import { ScrollView, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import { AppBrandFooter } from "../../components/branding/AppBrandFooter";
import { AdminHubCard } from "../components/AdminHubCard";

type AdminRouteHref = Href;

export default function AdminHome() {
    const router = useRouter();
    const { colors } = useTheme();

    const go = (href: AdminRouteHref) => {
        router.push(href);
    };

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 28 }}
        >
            <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>Panel de administración</Text>
                <Text style={{ color: colors.mutedText }}>
                    Gestiona usuarios y ajustes globales de la app.
                </Text>
            </View>

            <View
                style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    borderRadius: 16,
                    padding: 14,
                    gap: 10,
                }}
            >
                <Text style={{ fontWeight: "800", color: colors.text, fontSize: 16 }}>
                    Secciones de administración
                </Text>
                <Text style={{ color: colors.mutedText }}>
                    Elige una sección para continuar.
                </Text>

                {/* <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                    <Pressable
                        onPress={() => go("/(app)/admin/users")}
                        style={({ pressed }) => ({
                            flexGrow: 1,
                            minWidth: 140,
                            paddingVertical: 12,
                            paddingHorizontal: 14,
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: pressed ? colors.background : colors.surface,
                            opacity: pressed ? 0.8 : 1,
                            alignItems: "center",
                        })}
                    >
                        <Text style={{ color: colors.text, fontWeight: "900" }}>Usuarios</Text>
                    </Pressable>

                    <Pressable
                        onPress={() => go("/(app)/admin/settings")}
                        style={({ pressed }) => ({
                            flexGrow: 1,
                            minWidth: 140,
                            paddingVertical: 12,
                            paddingHorizontal: 14,
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: pressed ? colors.background : colors.surface,
                            opacity: pressed ? 0.80 : 1,
                            alignItems: "center",
                        })}
                    >
                        <Text style={{ color: colors.text, fontWeight: "900" }}>Ajustes de la app</Text>
                    </Pressable>
                </View> */}
            </View>

            <AdminHubCard
                title="Usuarios (Admin)"
                subtitle="Crea, edita y desactiva usuarios."
                buttonText="Ir a Usuarios"
                onPress={() => go("/(app)/admin/users")}
            />

            <AdminHubCard
                title="Ajustes de la app"
                subtitle="Configura parámetros globales (solo admin)."
                buttonText="Ir a Ajustes"
                onPress={() => go("/(app)/admin/settings")}
            />

            {/* Mini-brand footer (Dashboard only) */}
            <View style={{ marginVertical: 15 }}>
                <AppBrandFooter />
            </View>
        </ScrollView>
    );
}