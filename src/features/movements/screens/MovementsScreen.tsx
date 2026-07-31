// /src/features/movements/screens/MovementsScreen.tsx
// Movement catalog with search, local ordering, grouped sections, and media preview.

import { useRouter, type Href } from "expo-router";
import React from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    View,
} from "react-native";

import { useDeleteMovement, useMovements } from "@/src/hooks/useMovements";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { Movement, MovementsListQuery } from "@/src/types/movements.types";

import {
    MediaViewerModal,
    type MediaViewerItem,
} from "../../components/media/MediaViewerModal";
import { getMovementErrorMessage } from "../components/movementErrorMessage";
import { MovementsFilters } from "../components/MovementsFilters";
import { MovementsList } from "../components/MovementsList";
import {
    sortMovements,
    type MovementSortMode,
} from "../components/movementSorting";

export default function MovementsScreen() {
    const router = useRouter();
    const { colors } = useTheme();

    const [search, setSearch] = React.useState("");
    const [activeOnly, setActiveOnly] = React.useState(true);
    const [sortMode, setSortMode] = React.useState<MovementSortMode>("name");
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
        [debouncedSearch, activeOnly],
    );

    const movementsQuery = useMovements(query);
    const deleteMovementMutation = useDeleteMovement(query);

    const items = React.useMemo(
        () => sortMovements(movementsQuery.data ?? [], sortMode),
        [movementsQuery.data, sortMode],
    );
    const loading = movementsQuery.isLoading || movementsQuery.isFetching;
    const error = movementsQuery.error
        ? getMovementErrorMessage(
            movementsQuery.error,
            "No se pudieron cargar los movimientos.",
        )
        : "";

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
                            Alert.alert(
                                "Error",
                                getMovementErrorMessage(
                                    errorValue,
                                    "No se pudo eliminar el movimiento.",
                                ),
                            );
                        }
                    },
                },
            ],
            { cancelable: true },
        );
    }

    function onOpenMedia(item: MediaViewerItem) {
        setViewer(item);
    }

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ padding: 16, paddingTop: 12, gap: 10, paddingBottom: 28 }}
            refreshControl={
                <RefreshControl refreshing={loading} onRefresh={onRefresh} />
            }
        >
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                }}
            >
                <View style={{ flex: 1, gap: 2 }}>
                    <Text
                        style={{ fontSize: 22, fontWeight: "800", color: colors.text }}
                    >
                        Movimientos
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.mutedText }}>
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
                    <Text style={{ color: colors.primaryText, fontWeight: "800" }}>
                        Nuevo
                    </Text>
                </Pressable>
            </View>

            <MovementsFilters
                search={search}
                activeOnly={activeOnly}
                sortMode={sortMode}
                onChangeSearch={setSearch}
                onChangeActiveOnly={setActiveOnly}
                onChangeSortMode={setSortMode}
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
                    <Text style={{ color: colors.mutedText }}>
                        Cargando movimientos...
                    </Text>
                </View>
            ) : null}

            <Text
                style={{ color: colors.mutedText, fontSize: 12, fontWeight: "700" }}
            >
                Mostrando {items.length}
            </Text>

            <MovementsList
                items={items}
                sortMode={sortMode}
                onEdit={onEdit}
                onDelete={onDelete}
                onOpenMedia={onOpenMedia}
            />

            <MediaViewerModal
                visible={Boolean(viewer)}
                item={viewer}
                onClose={() => setViewer(null)}
            />
        </ScrollView>
    );
}
