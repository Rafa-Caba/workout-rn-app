// src/features/bodyMetrics/screens/BodyMetricsScreen.tsx

import React from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import { AppBrandFooter } from "@/src/features/components/branding/AppBrandFooter";
import { useBodyMetrics } from "@/src/hooks/bodyMetrics/useBodyMetrics";
import { useDeleteBodyMetric } from "@/src/hooks/bodyMetrics/useDeleteBodyMetric";
import { useLatestBodyMetric } from "@/src/hooks/bodyMetrics/useLatestBodyMetric";
import { useUpsertBodyMetric } from "@/src/hooks/bodyMetrics/useUpsertBodyMetric";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { UserMetricEntry } from "@/src/types/bodyMetrics.types";

import { BodyMetricFormModal } from "../components/BodyMetricFormModal";
import { BodyMetricsEmptyState } from "../components/BodyMetricsEmptyState";
import { BodyMetricsEntryCard } from "../components/BodyMetricsEntryCard";
import { BodyMetricsHeroCard } from "../components/BodyMetricsHeroCard";

function sortEntriesDesc(entries: UserMetricEntry[]): UserMetricEntry[] {
    return [...entries].sort((a, b) => {
        if (a.date === b.date) {
            return b.updatedAt.localeCompare(a.updatedAt);
        }

        return b.date.localeCompare(a.date);
    });
}

function getErrorMessage(error: unknown): string {
    if (typeof error === "object" && error !== null) {
        const maybe = error as { message?: unknown };
        if (typeof maybe.message === "string" && maybe.message.trim()) {
            return maybe.message.trim();
        }
    }

    return "Ocurrió un error";
}

export function BodyMetricsScreen() {
    const { colors } = useTheme();

    const bodyMetricsQuery = useBodyMetrics();
    const latestMetricQuery = useLatestBodyMetric();

    const upsertMutation = useUpsertBodyMetric();
    const deleteMutation = useDeleteBodyMetric();

    const [modalVisible, setModalVisible] = React.useState(false);
    const [editingEntry, setEditingEntry] = React.useState<UserMetricEntry | null>(null);

    const entries = React.useMemo(
        () => sortEntriesDesc(bodyMetricsQuery.data?.metrics ?? []),
        [bodyMetricsQuery.data?.metrics]
    );

    const openCreate = React.useCallback(() => {
        setEditingEntry(null);
        setModalVisible(true);
    }, []);

    const openEdit = React.useCallback((entry: UserMetricEntry) => {
        setEditingEntry(entry);
        setModalVisible(true);
    }, []);

    const onRefresh = React.useCallback(() => {
        void Promise.all([bodyMetricsQuery.refetch(), latestMetricQuery.refetch()]);
    }, [bodyMetricsQuery, latestMetricQuery]);

    const handleDelete = React.useCallback(
        (entry: UserMetricEntry) => {
            Alert.alert(
                "Eliminar registro",
                `¿Deseas eliminar el registro del ${entry.date}?`,
                [
                    { text: "Cancelar", style: "cancel" },
                    {
                        text: "Eliminar",
                        style: "destructive",
                        onPress: () => {
                            deleteMutation.mutate(
                                { date: entry.date },
                                {
                                    onError: (error) => {
                                        Alert.alert(
                                            "No se pudo eliminar",
                                            getErrorMessage(error)
                                        );
                                    },
                                }
                            );
                        },
                    },
                ]
            );
        },
        [deleteMutation]
    );

    const handleSave = React.useCallback(
        async ({
            date,
            payload,
        }: {
            date: string;
            payload: {
                weightKg?: number | null;
                bodyFatPct?: number | null;
                waistCm?: number | null;
                notes?: string | null;
                source?: "manual" | "profile" | "device" | "import" | "coach";
            };
        }) => {
            try {
                await upsertMutation.mutateAsync({
                    date,
                    payload,
                });

                setModalVisible(false);
                setEditingEntry(null);
            } catch (error) {
                Alert.alert(
                    "No se pudo guardar",
                    getErrorMessage(error)
                );
            }
        },
        [upsertMutation]
    );

    const showInitialLoading =
        (bodyMetricsQuery.isLoading && !bodyMetricsQuery.data) ||
        (latestMetricQuery.isLoading && !latestMetricQuery.data);

    return (
        <>
            <ScrollView
                style={{ flex: 1, backgroundColor: colors.background }}
                contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 30 }}
                refreshControl={
                    <RefreshControl
                        refreshing={bodyMetricsQuery.isRefetching || latestMetricQuery.isRefetching}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                    />
                }
            >
                <View style={{ gap: 4 }}>
                    <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>
                        Métricas corporales
                    </Text>
                    <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                        Registra peso, cintura y composición corporal para enriquecer tu progreso.
                    </Text>
                </View>

                <BodyMetricsHeroCard
                    latest={latestMetricQuery.data?.latest ?? null}
                    onCreate={openCreate}
                />

                {showInitialLoading ? (
                    <View
                        style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 16,
                            padding: 18,
                            gap: 10,
                            alignItems: "center",
                            backgroundColor: colors.surface,
                        }}
                    >
                        <ActivityIndicator />
                        <Text style={{ color: colors.mutedText, fontWeight: "700" }}>
                            Cargando métricas corporales...
                        </Text>
                    </View>
                ) : bodyMetricsQuery.isError ? (
                    <View
                        style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 16,
                            padding: 18,
                            gap: 10,
                            alignItems: "center",
                            backgroundColor: colors.surface,
                        }}
                    >
                        <Text style={{ color: colors.text, fontWeight: "800" }}>
                            No se pudo cargar tu historial corporal
                        </Text>
                        <Text style={{ color: colors.mutedText }}>
                            Intenta de nuevo con pull to refresh.
                        </Text>
                    </View>
                ) : entries.length === 0 ? (
                    <BodyMetricsEmptyState onCreate={openCreate} />
                ) : (
                    <View style={{ gap: 10 }}>
                        <View
                            style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 12,
                            }}
                        >
                            <View style={{ gap: 2, flex: 1 }}>
                                <Text style={{ color: colors.text, fontWeight: "800", fontSize: 17 }}>
                                    Historial
                                </Text>
                                <Text style={{ color: colors.mutedText }}>
                                    {entries.length} registro(s) guardado(s)
                                </Text>
                            </View>

                            <Pressable
                                onPress={openCreate}
                                style={({ pressed }) => ({
                                    paddingHorizontal: 12,
                                    paddingVertical: 10,
                                    borderRadius: 12,
                                    backgroundColor: colors.primary,
                                    opacity: pressed ? 0.92 : 1,
                                })}
                            >
                                <Text style={{ color: colors.primaryText, fontWeight: "800" }}>
                                    Nuevo
                                </Text>
                            </Pressable>
                        </View>

                        {entries.map((entry) => (
                            <BodyMetricsEntryCard
                                key={entry.id}
                                entry={entry}
                                onEdit={() => openEdit(entry)}
                                onDelete={() => handleDelete(entry)}
                            />
                        ))}
                    </View>
                )}

                <AppBrandFooter />
            </ScrollView>

            <BodyMetricFormModal
                visible={modalVisible}
                initialEntry={editingEntry}
                onClose={() => {
                    if (upsertMutation.isPending) return;
                    setModalVisible(false);
                    setEditingEntry(null);
                }}
                onSave={handleSave}
                saving={upsertMutation.isPending}
            />

            {deleteMutation.isPending ? (
                <View
                    pointerEvents="none"
                    style={{
                        position: "absolute",
                        left: 16,
                        right: 16,
                        bottom: 16,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 14,
                        padding: 12,
                        backgroundColor: colors.surface,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                    }}
                >
                    <ActivityIndicator size="small" />
                    <Text style={{ color: colors.text, fontWeight: "800" }}>
                        Eliminando registro...
                    </Text>
                </View>
            ) : null}
        </>
    );
}

export default BodyMetricsScreen;