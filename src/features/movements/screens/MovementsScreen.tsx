// /src/features/movements/screens/MovementsScreen.tsx
import { useRouter, type Href } from "expo-router";
import React from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import { useCreateMovement, useDeleteMovement, useMovements } from "@/src/hooks/useMovements";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { Movement, MovementsListQuery } from "@/src/types/movements.types";

import { MediaViewerItem, MediaViewerModal } from "../../components/media/MediaViewerModal";
import { MovementsFilters } from "../components/MovementsFilters";
import { MovementsList } from "../components/MovementsList";
import { buildMovementFormData, type MovementFormState } from "../components/movementFormData";

function safeText(value: unknown): string {
    const text = String(value ?? "").trim();
    return text.length ? text : "—";
}

export default function MovementsScreen() {
    const router = useRouter();
    const { colors } = useTheme();

    const [search, setSearch] = React.useState("");
    const [activeOnly, setActiveOnly] = React.useState(true);
    const [viewer, setViewer] = React.useState<MediaViewerItem | null>(null);

    const [debouncedSearch, setDebouncedSearch] = React.useState("");
    const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => setDebouncedSearch(search), 280);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [search]);

    const query: MovementsListQuery = React.useMemo(
        () => ({
            q: debouncedSearch.trim() ? debouncedSearch.trim() : undefined,
            activeOnly: activeOnly ? true : undefined,
        }),
        [debouncedSearch, activeOnly]
    );

    const movementsQuery = useMovements(query);
    const createMovementMutation = useCreateMovement(query);
    const deleteMovementMutation = useDeleteMovement(query);

    const items = movementsQuery.data ?? [];
    const loading = movementsQuery.isLoading || movementsQuery.isFetching;
    const error = movementsQuery.error
        ? safeText((movementsQuery.error as { message?: string }).message)
        : "";

    const [form, setForm] = React.useState<MovementFormState>({
        name: "",
        muscleGroup: [],
        equipment: [],
        isActive: true,
        image: null,
    });

    async function onRefresh() {
        await movementsQuery.refetch();
    }

    function go(href: Href) {
        router.push(href);
    }

    function onNew() {
        go("/(app)/movements/new");
    }

    function onEdit(movement: Movement) {
        router.push({
            pathname: "/(app)/movements/[id]",
            params: { id: movement.id },
        });
    }

    function onDelete(movement: Movement) {
        Alert.alert(
            "Eliminar movimiento",
            `¿Deseas eliminar "${movement.name}"?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteMovementMutation.mutateAsync({ id: movement.id });
                        } catch (errorValue: unknown) {
                            Alert.alert("Error", safeText(errorValue));
                        }
                    },
                },
            ],
            { cancelable: true }
        );
    }

    async function onCreate() {
        const trimmedName = form.name.trim();
        if (!trimmedName) {
            return;
        }

        const formData = buildMovementFormData(
            { ...form, name: trimmedName },
            { imageFieldName: "media" }
        );

        try {
            await createMovementMutation.mutateAsync(formData);
            setForm({
                name: "",
                muscleGroup: [],
                equipment: [],
                isActive: true,
                image: null,
            });
        } catch (errorValue: unknown) {
            Alert.alert("Error", safeText(errorValue));
        }
    }

    function onOpenMedia(item: MediaViewerItem) {
        setViewer(item);
    }

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 28 }}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
        >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>Movimientos</Text>
                    <Text style={{ color: colors.mutedText }}>
                        Catálogo para el selector de ejercicios en rutinas.
                    </Text>
                </View>

                <Pressable
                    onPress={onNew}
                    style={({ pressed }) => ({
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 12,
                        backgroundColor: colors.primary,
                        opacity: pressed ? 0.92 : 1,
                    })}
                >
                    <Text style={{ color: colors.primaryText, fontWeight: "800" }}>Nuevo</Text>
                </Pressable>
            </View>

            <MovementsFilters
                search={search}
                activeOnly={activeOnly}
                onChangeSearch={setSearch}
                onChangeActiveOnly={setActiveOnly}
            />

            {error ? (
                <View
                    style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                        borderRadius: 16,
                        padding: 12,
                        gap: 8,
                    }}
                >
                    <Text style={{ fontWeight: "800", color: colors.text }}>Error</Text>
                    <Text style={{ color: colors.mutedText }}>{error}</Text>
                </View>
            ) : null}

            {loading && items.length === 0 ? (
                <View style={{ paddingVertical: 18, alignItems: "center", gap: 10 }}>
                    <ActivityIndicator />
                    <Text style={{ color: colors.mutedText }}>Cargando movimientos...</Text>
                </View>
            ) : null}

            <Text style={{ color: colors.mutedText, fontSize: 12, fontWeight: "700" }}>
                Mostrando {items.length}
            </Text>

            <MovementsList
                items={items}
                onEdit={onEdit}
                onDelete={onDelete}
                onOpenMedia={onOpenMedia}
            />

            <MediaViewerModal visible={Boolean(viewer)} item={viewer} onClose={() => setViewer(null)} />
        </ScrollView>
    );
}