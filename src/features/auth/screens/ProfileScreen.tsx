// src/features/auth/screens/ProfileScreen.tsx
import { useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Alert, Image, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import { BodyMetricsIllustration } from "@/src/features/bodyMetrics/components/BodyMetricsIllustration";
import { useMe } from "@/src/hooks/auth/useMe";
import { useSettings } from "@/src/hooks/auth/useSettings";
import { useLatestBodyMetric } from "@/src/hooks/bodyMetrics/useLatestBodyMetric";
import { useAuthStore } from "@/src/store/auth.store";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { AuthUser, Units } from "@/src/types/auth.types";
import type { WeekStartsOn } from "@/src/types/settings.types";
import { formatWeirdUsDateTime } from "@/src/utils/dates/dateDisplay";

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

function weekStartsOnLabel(v: WeekStartsOn): string {
    return v === 1 ? "Lunes" : "Domingo";
}

function rpeLabel(v: number | null | undefined): string {
    return typeof v === "number" && Number.isFinite(v) ? String(v) : "—";
}

function formatPercent(v: number | null | undefined): string {
    if (typeof v !== "number" || !Number.isFinite(v)) return "—";
    return `${v.toFixed(1)}%`;
}

function formatCm(v: number | null | undefined): string {
    if (typeof v !== "number" || !Number.isFinite(v)) return "—";
    return `${v.toFixed(1)} cm`;
}

type ThemeColors = ReturnType<typeof useTheme>["colors"];

function Row(props: { label: string; value: string; colors: ThemeColors }) {
    const { colors } = props;
    return (
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
            <Text style={{ color: colors.mutedText, fontWeight: "600" }}>{props.label}</Text>
            <Text style={{ color: colors.text, fontWeight: "700" }}>{props.value}</Text>
        </View>
    );
}

function Card(props: { children: React.ReactNode }) {
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
            {props.children}
        </View>
    );
}

function CardHeader(props: { title: string; subtitle?: string }) {
    const { colors } = useTheme();
    return (
        <View style={{ gap: 2 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text }}>{props.title}</Text>
            {props.subtitle ? <Text style={{ color: colors.mutedText }}>{props.subtitle}</Text> : null}
        </View>
    );
}

export default function ProfileScreen() {
    const router = useRouter();
    const { colors } = useTheme();

    const logout = useAuthStore((s) => s.logout);

    const { me, loading, error, refetch } = useMe(true);
    const latestBodyMetricQuery = useLatestBodyMetric();
    const { settings, loading: settingsLoading, error: settingsError, lastLoadedAt } = useSettings(true);

    const profile: AuthUser | null = me;

    const avatarUrl = (profile?.profilePicUrl ?? "").trim() || null;
    const initials = initialsFromName(profile?.name ?? "User");

    const onLogout = async () => {
        try {
            await logout();
        } finally {
            router.replace("/(auth)/login");
        }
    };

    const onEditProfile = () => {
        router.push("/(app)/me/edit");
    };

    const onOpenBodyMetrics = () => {
        router.push("/(app)/me/body-metrics");
    };

    const onAvatarPress = () => {
        const hasPic = Boolean(avatarUrl);

        Alert.alert("Foto de perfil", "¿Qué deseas hacer?", [
            {
                text: "Cambiar foto",
                onPress: () => {
                    Alert.alert("Próximamente", "Aquí conectaremos el selector de imagen y la subida.");
                },
            },
            ...(hasPic
                ? [
                    {
                        text: "Eliminar foto",
                        style: "destructive",
                        onPress: () => {
                            Alert.alert("Próximamente", "Aquí conectaremos deleteProfilePic().");
                        },
                    } as const,
                ]
                : []),
            { text: "Cancelar", style: "cancel" },
        ]);
    };

    const roleLabel = safeText(profile?.role);
    const coachModeLabel = safeText(profile?.coachMode) === "NONE" ? "REGULAR" : safeText(profile?.coachMode);

    const goalLabel = safeText(profile?.activityGoal);
    const trainingLevelLabel = safeText(profile?.trainingLevel);
    const latestMetric = latestBodyMetricQuery.data?.latest ?? null;

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 28 }}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refetch()} />}
        >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>Mi perfil</Text>
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
                    <Text style={{ fontWeight: "800", color: colors.text }}>Editar perfil</Text>
                </Pressable>
            </View>

            {loading && !profile ? (
                <View style={{ paddingVertical: 20, alignItems: "center", justifyContent: "center", gap: 10 }}>
                    <ActivityIndicator />
                    <Text style={{ color: colors.mutedText }}>Cargando perfil...</Text>
                </View>
            ) : null}

            {error ? (
                <Card>
                    <CardHeader title="Error" subtitle="No se pudo cargar tu perfil" />
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
                        <Text style={{ color: colors.primaryText, fontWeight: "800" }}>Reintentar</Text>
                    </Pressable>
                </Card>
            ) : null}

            <Card>
                <CardHeader title="Cuenta" subtitle="Información de tu cuenta y perfil." />

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
                            <Image source={{ uri: avatarUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" fadeDuration={0} />
                        ) : (
                            <Text style={{ fontWeight: "800", color: colors.mutedText, fontSize: 20 }}>{initials}</Text>
                        )}
                    </Pressable>

                    <View style={{ flex: 1, gap: 4 }}>
                        <Text style={{ fontWeight: "800", color: colors.text, fontSize: 18 }}>{safeText(profile?.name)}</Text>
                        <Text style={{ color: colors.mutedText, fontWeight: "700" }}>{safeText(profile?.email)}</Text>

                        <Text style={{ color: colors.mutedText }}>
                            {roleLabel} · {coachModeLabel}
                        </Text>

                        <Text style={{ color: colors.mutedText, fontSize: 11, fontStyle: "italic", fontWeight: "500" }}>
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
                    <Row colors={colors} label="Altura" value={formatHeightCm(profile?.heightCm)} />
                    <Row colors={colors} label="Peso actual" value={formatWeight(profile?.currentWeightKg, profile?.units)} />
                    <Row colors={colors} label="Unidades" value={formatUnits(profile?.units)} />
                    <Row colors={colors} label="Fecha de nacimiento" value={formatBirthDate(profile?.birthDate)} />
                    <Row colors={colors} label="Objetivo" value={goalLabel} />
                    <Row colors={colors} label="Nivel de entrenamiento" value={trainingLevelLabel} />
                    <Row colors={colors} label="Notas de salud" value={safeText(profile?.healthNotes)} />
                    <Row colors={colors} label="Último inicio" value={formatDateTime(profile?.lastLoginAt)} />
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
                    <Text style={{ fontWeight: "800", color: colors.text }}>Editar perfil</Text>
                </Pressable>
            </Card>

            <Card>
                <CardHeader
                    title="Historial corporal"
                    subtitle="Sigue tu peso, cintura y composición corporal desde una sola pantalla."
                />

                <View
                    style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 14,
                        padding: 12,
                        backgroundColor: colors.background,
                        gap: 12,
                    }}
                >
                    <View style={{ alignItems: "center" }}>
                        <BodyMetricsIllustration />
                    </View>

                    <View style={{ gap: 8 }}>
                        <Row
                            colors={colors}
                            label="Último registro"
                            value={latestMetric ? latestMetric.date : "—"}
                        />
                        <Row
                            colors={colors}
                            label="Peso"
                            value={formatWeight(latestMetric?.weightKg ?? null, profile?.units)}
                        />
                        <Row
                            colors={colors}
                            label="Grasa corporal"
                            value={formatPercent(latestMetric?.bodyFatPct ?? null)}
                        />
                        <Row
                            colors={colors}
                            label="Cintura"
                            value={formatCm(latestMetric?.waistCm ?? null)}
                        />
                    </View>

                    {latestBodyMetricQuery.isLoading ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <ActivityIndicator size="small" />
                            <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                                Cargando historial corporal...
                            </Text>
                        </View>
                    ) : null}

                    {latestBodyMetricQuery.isError ? (
                        <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                            No se pudo cargar el último registro corporal.
                        </Text>
                    ) : null}
                </View>

                <Pressable
                    onPress={onOpenBodyMetrics}
                    style={({ pressed }) => ({
                        paddingVertical: 12,
                        borderRadius: 12,
                        backgroundColor: colors.primary,
                        alignItems: "center",
                        opacity: pressed ? 0.92 : 1,
                    })}
                >
                    <Text style={{ fontWeight: "800", color: colors.primaryText }}>
                        Ver métricas corporales
                    </Text>
                </Pressable>
            </Card>

            <Card>
                <CardHeader title="Aplicación" subtitle="Preferencias de comportamiento y visualización." />

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
                    <Row colors={colors} label="Semana inicia en" value={weekStartsOnLabel(settings.weekStartsOn)} />
                    <Row colors={colors} label="RPE por defecto" value={rpeLabel(settings.defaults?.defaultRpe ?? null)} />
                </View>

                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                        Última actualización: {lastLoadedAt ? formatDateTime(lastLoadedAt) : "—"}
                    </Text>

                    {settingsLoading ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <ActivityIndicator size="small" />
                            <Text style={{ color: colors.mutedText, fontSize: 12 }}>Cargando...</Text>
                        </View>
                    ) : null}
                </View>

                {settingsError ? <Text style={{ color: colors.mutedText, fontSize: 12 }}>{safeText(settingsError)}</Text> : null}

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
                    <Text style={{ fontWeight: "800", color: colors.text }}>Editar preferencias</Text>
                </Pressable>
            </Card>

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
                <Text style={{ color: colors.primaryText, fontWeight: "800" }}>Cerrar sesión</Text>
            </Pressable>
        </ScrollView>
    );
}