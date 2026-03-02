// src/features/movements/screens/MovementDetailScreen.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from "react-native";

import { useDeleteMovement, useMovementById, useUpdateMovement } from "@/src/hooks/useMovements";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { MovementsListQuery } from "@/src/types/movements.types";

import { MovementForm } from "../components/MovementForm";
import { buildMovementFormData, type MovementFormState } from "../components/movementFormData";

function safeText(v: unknown): string {
    const s = String(v ?? "").trim();
    return s.length ? s : "—";
}

const REFRESH_QUERY: MovementsListQuery = { activeOnly: true };

export default function MovementDetailScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const params = useLocalSearchParams<{ id?: string }>();

    const id = String(params.id ?? "");
    const mQ = useMovementById(id);

    const updateM = useUpdateMovement(REFRESH_QUERY);
    const deleteM = useDeleteMovement(REFRESH_QUERY);

    const [form, setForm] = React.useState<MovementFormState>({
        name: "",
        muscleGroup: null,
        equipment: null,
        isActive: true,
        image: null,
    });

    const hydratedRef = React.useRef(false);

    React.useEffect(() => {
        if (!mQ.data || hydratedRef.current) return;
        hydratedRef.current = true;

        setForm({
            name: mQ.data.name ?? "",
            muscleGroup: mQ.data.muscleGroup ?? null,
            equipment: mQ.data.equipment ?? null,
            isActive: Boolean(mQ.data.isActive),
            image: null,
        });
    }, [mQ.data]);

    const onSave = async () => {
        const nameTrim = form.name.trim();
        if (!nameTrim) return;

        const fd = buildMovementFormData({ ...form, name: nameTrim }, { imageFieldName: "media" });

        try {
            await updateM.mutateAsync({ id, formData: fd });
            Alert.alert("Listo", "Movimiento actualizado.");
        } catch (e: unknown) {
            Alert.alert("Error", safeText(e));
        }
    };

    const onDelete = () => {
        if (!mQ.data) return;

        Alert.alert(
            "Eliminar movimiento",
            `¿Deseas eliminar "${mQ.data.name}"?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteM.mutateAsync({ id });
                            router.back();
                        } catch (e: unknown) {
                            Alert.alert("Error", safeText(e));
                        }
                    },
                },
            ],
            { cancelable: true }
        );
    };

    const loading = mQ.isLoading;
    const currentUrl = mQ.data?.media?.url ?? null;

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 28 }}
            keyboardShouldPersistTaps="handled"
        >
            {/* Header w actions (like AdminUsers style but for detail) */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>Editar ejercicio</Text>
                    <Text style={{ color: colors.mutedText }}>Actualiza datos e imagen del movimiento.</Text>
                </View>

                <Pressable
                    onPress={onDelete}
                    disabled={!mQ.data || deleteM.isPending}
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
                        {deleteM.isPending ? "Eliminando..." : "Eliminar"}
                    </Text>
                </Pressable>
            </View>

            {/* Loading empty */}
            {loading && !mQ.data ? (
                <View style={{ paddingVertical: 18, alignItems: "center", gap: 10 }}>
                    <ActivityIndicator />
                    <Text style={{ color: colors.mutedText }}>Cargando movimiento...</Text>
                </View>
            ) : null}

            {/* Current image */}
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
                busy={updateM.isPending}
                disabled={!mQ.data}
            />
        </ScrollView>
    );
}