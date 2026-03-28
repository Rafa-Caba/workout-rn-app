// /src/features/movements/screens/MovementDetailScreen.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from "react-native";

import { useDeleteMovement, useMovementById, useUpdateMovement } from "@/src/hooks/useMovements";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { MovementsListQuery } from "@/src/types/movements.types";

import { MovementForm } from "../components/MovementForm";
import { buildMovementFormData, type MovementFormState } from "../components/movementFormData";

function safeText(value: unknown): string {
    const text = String(value ?? "").trim();
    return text.length ? text : "—";
}

const REFRESH_QUERY: MovementsListQuery = { activeOnly: true };

export default function MovementDetailScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const params = useLocalSearchParams<{ id?: string }>();

    const id = String(params.id ?? "");
    const movementQuery = useMovementById(id);

    const updateMovementMutation = useUpdateMovement(REFRESH_QUERY);
    const deleteMovementMutation = useDeleteMovement(REFRESH_QUERY);

    const [form, setForm] = React.useState<MovementFormState>({
        name: "",
        muscleGroup: [],
        equipment: [],
        isActive: true,
        image: null,
    });

    const hydratedRef = React.useRef(false);

    React.useEffect(() => {
        if (!movementQuery.data || hydratedRef.current) {
            return;
        }

        hydratedRef.current = true;

        setForm({
            name: movementQuery.data.name ?? "",
            muscleGroup: Array.isArray(movementQuery.data.muscleGroup)
                ? movementQuery.data.muscleGroup
                : [],
            equipment: Array.isArray(movementQuery.data.equipment)
                ? movementQuery.data.equipment
                : [],
            isActive: Boolean(movementQuery.data.isActive),
            image: null,
        });
    }, [movementQuery.data]);

    async function onSave() {
        const trimmedName = form.name.trim();
        if (!trimmedName) {
            return;
        }

        const formData = buildMovementFormData(
            { ...form, name: trimmedName },
            { imageFieldName: "media" }
        );

        try {
            await updateMovementMutation.mutateAsync({ id, formData });
            Alert.alert("Listo", "Movimiento actualizado.");
        } catch (errorValue: unknown) {
            Alert.alert("Error", safeText(errorValue));
        }
    }

    function onDelete() {
        if (!movementQuery.data) {
            return;
        }

        Alert.alert(
            "Eliminar movimiento",
            `¿Deseas eliminar "${movementQuery.data.name}"?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteMovementMutation.mutateAsync({ id });
                            router.back();
                        } catch (errorValue: unknown) {
                            Alert.alert("Error", safeText(errorValue));
                        }
                    },
                },
            ],
            { cancelable: true }
        );
    }

    const loading = movementQuery.isLoading;
    const currentUrl = movementQuery.data?.media?.url ?? null;

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 28 }}
            keyboardShouldPersistTaps="handled"
        >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>Editar ejercicio</Text>
                    <Text style={{ color: colors.mutedText }}>Actualiza datos e imagen del movimiento.</Text>
                </View>

                <Pressable
                    onPress={onDelete}
                    disabled={!movementQuery.data || deleteMovementMutation.isPending}
                    style={({ pressed }) => ({
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                        opacity: pressed ? 0.92 : 1,
                    })}
                >
                    <Text style={{ color: colors.mutedText, fontWeight: "800" }}>
                        {deleteMovementMutation.isPending ? "Eliminando..." : "Eliminar"}
                    </Text>
                </Pressable>
            </View>

            {loading && !movementQuery.data ? (
                <View style={{ paddingVertical: 18, alignItems: "center", gap: 10 }}>
                    <ActivityIndicator />
                    <Text style={{ color: colors.mutedText }}>Cargando movimiento...</Text>
                </View>
            ) : null}

            {currentUrl && !form.image ? (
                <View
                    style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                        borderRadius: 16,
                        padding: 12,
                        gap: 10,
                    }}
                >
                    <Text style={{ fontWeight: "900", color: colors.text }}>Imagen actual</Text>
                    <View
                        style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                            borderRadius: 16,
                            overflow: "hidden",
                        }}
                    >
                        <Image source={{ uri: currentUrl }} style={{ width: "100%", height: 170 }} />
                    </View>
                    <Text style={{ color: colors.mutedText, fontWeight: "700", fontSize: 12 }}>
                        Selecciona una nueva imagen si deseas reemplazarla.
                    </Text>
                </View>
            ) : null}

            <MovementForm
                submitLabel="Guardar"
                value={form}
                onChange={setForm}
                onSubmit={onSave}
                busy={updateMovementMutation.isPending}
                disabled={!movementQuery.data}
            />
        </ScrollView>
    );
}