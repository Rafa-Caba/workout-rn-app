// src/features/auth/screens/ProfileScreen.tsx
import { useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Alert, Image, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import { useMe } from "@/src/hooks/auth/useMe";
import { useAuthStore } from "@/src/store/auth.store";
import { useTheme } from "@/src/theme/ThemeProvider";
import { Units } from "@/src/types/auth.types";
import { formatWeirdUsDateTime } from "@/src/utils/dates/formatWeirdDate";

function initialsFromName(name: string): string {
    const parts = String(name ?? "")
        .trim()
        .split(/\s+/g)
        .filter(Boolean);
    const a = parts[0]?.[0] ?? "";
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
    const out = `${a}${b}`.toUpperCase();
    return out || "U";
}

function safeText(v: unknown): string {
    const s = String(v ?? "").trim();
    return s.length ? s : "—";
}

function formatDateTime(iso: string | null | undefined): string {
    const s = String(iso ?? "").trim();
    if (!s) return "—";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return formatWeirdUsDateTime(d.toLocaleString());
}

function formatBirthDate(iso: string | null | undefined): string {
    const s = String(iso ?? "").trim();
    if (!s) return "—";
    // keep YYYY-MM-DD format (server format) as-is for now
    return s;
}

function formatHeightCm(v: number | null | undefined): string {
    if (typeof v !== "number" || !Number.isFinite(v)) return "—";
    return `${v} cm`;
}

function formatWeight(vKg: number | null | undefined, units: Units | null | undefined): string {
    if (typeof vKg !== "number" || !Number.isFinite(vKg)) return "—";

    const weightUnit = units?.weight ?? "kg";

    if (weightUnit === "lb") {
        const lbs = vKg * 2.2046226218;
        return `${lbs.toFixed(1)} lb`;
    }

    return `${vKg.toFixed(1)} kg`;
}

function formatUnits(units: Units | null | undefined): string {
    if (!units) return "—";
    return `${units.weight}/${units.distance}`;
}

function Row(props: { label: string; value: string; colors: any }) {
    const { colors } = props;
    return (
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
            <Text style={{ color: colors.mutedText, fontWeight: "600" }}>{props.label}</Text>
            <Text style={{ color: colors.text, fontWeight: "700" }}>{props.value}</Text>
        </View>
    );
}

function Card(props: { title: string; subtitle?: string; children: React.ReactNode }) {
    const { colors } = useTheme();
    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 14,
                gap: 12,
            }}
        >
            {/* <View style={{ gap: 2 }}>
                <Text style={{ fontSize: 14, fontWeight: "900", color: colors.text }}>{props.title}</Text>
                {props.subtitle ? <Text style={{ color: colors.mutedText }}>{props.subtitle}</Text> : null}
            </View> */}
            {props.children}
        </View>
    );
}

export default function ProfileScreen() {
    const router = useRouter();
    const { colors } = useTheme();

    const logout = useAuthStore((s) => s.logout);

    const { me, loading, error, refetch } = useMe(true);

    const avatarUrl = String((me as any)?.profilePicUrl ?? "").trim() || null;
    const initials = initialsFromName(me?.name ?? "User");

    const onLogout = async () => {
        try {
            await logout();
        } finally {
            router.replace("/(auth)/login");
        }
    };

    const onEditProfile = () => {
        // Placeholder route (creamos luego el edit modal o screen)
        // Si prefieres modal, lo hacemos en el siguiente paso.
        router.push("/(app)/me/edit" as any);
    };

    const onAvatarPress = () => {
        // Placeholder until we wire ImagePicker + useUserStore().uploadProfilePic/deleteProfilePic
        const hasPic = Boolean(avatarUrl);

        Alert.alert("Foto de perfil", "¿Qué deseas hacer?", [
            {
                text: "Cambiar foto",
                onPress: () => {
                    Alert.alert("Próximamente", "Aquí conectaremos el selector de imagen y la subida.");
                },
            },
            ...(hasPic
                ? ([
                    {
                        text: "Eliminar foto",
                        style: "destructive",
                        onPress: () => {
                            Alert.alert("Próximamente", "Aquí conectaremos deleteProfilePic().");
                        },
                    },
                ] as any)
                : []),
            { text: "Cancelar", style: "cancel" },
        ]);
    };

    const roleLabel = safeText(me?.role);
    const coachModeLabel = safeText(me?.coachMode) === "NONE" ? "REGULAR" : safeText(me?.coachMode);
    const trainingLevelLabel = safeText((me as any)?.trainingLevel);
    const goalLabel = safeText((me as any)?.activityGoal);
    const unitsLabel = safeText((me as any)?.units);

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 28 }}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refetch()} />}
        >
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ fontSize: 22, fontWeight: "900", color: colors.text }}>Mi perfil</Text>
                    <Text style={{ color: colors.mutedText }}>Gestiona tu información personal y preferencias.</Text>
                </View>

                <Pressable
                    onPress={onEditProfile}
                    style={({ pressed }) => ({
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: pressed ? colors.background : colors.surface,
                        opacity: pressed ? 0.92 : 1,
                    })}
                >
                    <Text style={{ fontWeight: "900", color: colors.text }}>Editar perfil</Text>
                </Pressable>
            </View>

            {/* Loading / Error */}
            {loading && !me ? (
                <View style={{ paddingVertical: 20, alignItems: "center", justifyContent: "center", gap: 10 }}>
                    <ActivityIndicator />
                    <Text style={{ color: colors.mutedText }}>Cargando perfil...</Text>
                </View>
            ) : null}

            {error ? (
                <Card title="Error" subtitle="No se pudo cargar tu perfil">
                    <Text style={{ color: colors.mutedText }}>{safeText(error)}</Text>
                    <Pressable
                        onPress={() => void refetch()}
                        style={({ pressed }) => ({
                            marginTop: 8,
                            paddingVertical: 12,
                            borderRadius: 12,
                            backgroundColor: colors.primary,
                            alignItems: "center",
                            opacity: pressed ? 0.92 : 1,
                        })}
                    >
                        <Text style={{ color: colors.primaryText, fontWeight: "900" }}>Reintentar</Text>
                    </Pressable>
                </Card>
            ) : null}

            {/* Main card */}
            <Card title="Mi Perfil" subtitle="Gestiona tu información personal y preferencias.">
                <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                    <Pressable
                        onPress={onAvatarPress}
                        style={({ pressed }) => ({
                            height: 82,
                            width: 82,
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: pressed ? colors.background : colors.surface,
                            overflow: "hidden",
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: pressed ? 0.92 : 1,
                        })}
                    >
                        {avatarUrl ? (
                            <Image
                                source={{ uri: avatarUrl }}
                                style={{ width: "100%", height: "100%" }}
                                resizeMode="cover"
                                fadeDuration={0}
                                onError={() => {
                                    // If image fails, we just show initials fallback next render by clearing url visually is more work.
                                    // Keep it simple and non-destructive.
                                }}
                            />
                        ) : (
                            <Text style={{ fontWeight: "900", color: colors.mutedText, fontSize: 20 }}>{initials}</Text>
                        )}
                    </Pressable>

                    <View style={{ flex: 1, gap: 4 }}>
                        <Text style={{ fontWeight: "900", color: colors.text, fontSize: 18 }}>
                            {safeText(me?.name)}
                        </Text>
                        <Text style={{ color: colors.mutedText, fontWeight: "700" }}>{safeText(me?.email)}</Text>

                        <Text style={{ color: colors.mutedText }}>
                            {roleLabel} · {coachModeLabel}
                        </Text>

                        <Text style={{ color: colors.mutedText, fontSize: 11, fontStyle: 'italic', fontWeight: "500" }}>
                            Tip: toca tu foto para cambiarla o eliminarla.
                        </Text>
                    </View>
                </View>

                <View
                    style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 14,
                        padding: 12,
                        backgroundColor: colors.background,
                        gap: 10,
                    }}
                >
                    <Row colors={colors} label="Altura" value={formatHeightCm((me as any)?.heightCm)} />
                    <Row colors={colors} label="Peso actual" value={formatWeight((me as any)?.currentWeightKg, (me as any)?.units)} />
                    <Row colors={colors} label="Unidades" value={formatUnits(me?.units)} />
                    <Row colors={colors} label="Fecha de nacimiento" value={formatBirthDate((me as any)?.birthDate)} />
                    <Row colors={colors} label="Objetivo" value={goalLabel} />
                    <Row colors={colors} label="Nivel de entrenamiento" value={trainingLevelLabel} />
                    <Row colors={colors} label="Notas de salud" value={safeText((me as any)?.healthNotes)} />
                    <Row colors={colors} label="Último inicio" value={formatDateTime((me as any)?.lastLoginAt)} />
                </View>

                <Pressable
                    onPress={onEditProfile}
                    style={({ pressed }) => ({
                        paddingVertical: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: pressed ? colors.background : colors.surface,
                        alignItems: "center",
                        opacity: pressed ? 0.92 : 1,
                    })}
                >
                    <Text style={{ fontWeight: "900", color: colors.text }}>Editar perfil</Text>
                </Pressable>
            </Card>

            {/* Logout */}
            <Pressable
                onPress={onLogout}
                style={({ pressed }) => ({
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: colors.primary,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed ? 0.92 : 1,
                })}
            >
                <Text style={{ color: colors.primaryText, fontWeight: "900" }}>Cerrar sesión</Text>
            </Pressable>
        </ScrollView>
    );
}