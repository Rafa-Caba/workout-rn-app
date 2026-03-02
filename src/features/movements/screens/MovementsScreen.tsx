// src/features/movements/screens/MovementsScreen.tsx
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

function safeText(v: unknown): string {
    const s = String(v ?? "").trim();
    return s.length ? s : "—";
}

export default function MovementsScreen() {
    const router = useRouter();
    const { colors } = useTheme();

    const [search, setSearch] = React.useState("");
    const [activeOnly, setActiveOnly] = React.useState(true);
    const [viewer, setViewer] = React.useState<MediaViewerItem | null>(null);

    // debounce search like AdminUsers
    const [debouncedSearch, setDebouncedSearch] = React.useState("");
    const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setDebouncedSearch(search), 280);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [search]);

    const query: MovementsListQuery = React.useMemo(
        () => ({
            q: debouncedSearch.trim() ? debouncedSearch.trim() : undefined,
            activeOnly: activeOnly ? true : undefined,
        }),
        [debouncedSearch, activeOnly]
    );

    const movementsQ = useMovements(query);
    const createM = useCreateMovement(query);
    const deleteM = useDeleteMovement(query);

    const items = movementsQ.data ?? [];
    const loading = movementsQ.isLoading || movementsQ.isFetching;
    const error = movementsQ.error ? safeText((movementsQ.error as unknown as { message?: string })?.message) : "";

    const onRefresh = async () => {
        await movementsQ.refetch();
    };

    const go = (href: Href) => router.push(href);

    const onNew = () => {
        go("/(app)/movements/new");
    };

    const onEdit = (m: Movement) => {
        router.push({
            pathname: "/(app)/movements/[id]",
            params: { id: m.id },
        });
    };

    const onDelete = (m: Movement) => {
        Alert.alert(
            "Eliminar movimiento",
            `¿Deseas eliminar "${m.name}"?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteM.mutateAsync({ id: m.id });
                        } catch (e: unknown) {
                            Alert.alert("Error", safeText(e));
                        }
                    },
                },
            ],
            { cancelable: true }
        );
    };

    const [form, setForm] = React.useState<MovementFormState>({
        name: "",
        muscleGroup: null,
        equipment: null,
        isActive: true,
        image: null,
    });

    const onCreate = async () => {
        const nameTrim = form.name.trim();
        if (!nameTrim) return;

        const fd = buildMovementFormData({ ...form, name: nameTrim }, { imageFieldName: "image" });

        try {
            await createM.mutateAsync(fd);
            setForm({ name: "", muscleGroup: null, equipment: null, isActive: true, image: null });
        } catch (e: unknown) {
            Alert.alert("Error", safeText(e));
        }
    };

    const onOpenMedia = (item: MediaViewerItem) => {
        setViewer(item);
    };

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 28 }}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
        >
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>Movimientos</Text>
                    <Text style={{ color: colors.mutedText }}>Catálogo para el selector de ejercicios en rutinas.</Text>
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

            {/* Filters */}
            <MovementsFilters
                search={search}
                activeOnly={activeOnly}
                onChangeSearch={setSearch}
                onChangeActiveOnly={setActiveOnly}
            />

            {/* Error */}
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

            {/* Loading empty */}
            {loading && items.length === 0 ? (
                <View style={{ paddingVertical: 18, alignItems: "center", gap: 10 }}>
                    <ActivityIndicator />
                    <Text style={{ color: colors.mutedText }}>Cargando movimientos...</Text>
                </View>
            ) : null}

            {/* Create (inline like your screenshot) */}
            {/* <MovementForm
                title="Nuevo movimiento"
                submitLabel="Crear"
                value={form}
                onChange={setForm}
                onSubmit={onCreate}
                busy={createM.isPending}
            /> */}

            {/* Count */}
            <Text style={{ color: colors.mutedText, fontSize: 12, fontWeight: "700" }}>
                Mostrando {items.length}
            </Text>

            {/* List */}
            <MovementsList items={items} onEdit={onEdit} onDelete={onDelete} onOpenMedia={onOpenMedia} />

            <MediaViewerModal visible={!!viewer} item={viewer} onClose={() => setViewer(null)} />
        </ScrollView>
    );
}