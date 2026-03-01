// src/features/admin/users/screens/AdminUsers.tsx
import { useRouter, type Href } from "expo-router";
import React from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import { useAdminUsersStore } from "@/src/store/adminUsers.store";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { AdminUser } from "@/src/types/adminUser.types";

import { AdminUsersFilters } from "../components/AdminUsersFilters";
import { AdminUsersList } from "../components/AdminUsersList";
import { AdminUsersPagination } from "../components/AdminUsersPagination";

function safeText(v: unknown): string {
    const s = String(v ?? "").trim();
    return s.length ? s : "—";
}

function formatDateTime(iso: string | null): string {
    const s = String(iso ?? "").trim();
    if (!s) return "—";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleString();
}

export default function AdminUsers() {
    const router = useRouter();
    const { colors } = useTheme();

    const items = useAdminUsersStore((s) => s.items);
    const total = useAdminUsersStore((s) => s.total);

    const page = useAdminUsersStore((s) => s.page);
    const pageSize = useAdminUsersStore((s) => s.pageSize);

    const search = useAdminUsersStore((s) => s.search);
    const roleFilter = useAdminUsersStore((s) => s.roleFilter);
    const activeFilter = useAdminUsersStore((s) => s.activeFilter);
    const coachModeFilter = useAdminUsersStore((s) => s.coachModeFilter);

    const loading = useAdminUsersStore((s) => s.loading);
    const error = useAdminUsersStore((s) => s.error);

    const setSearch = useAdminUsersStore((s) => s.setSearch);
    const setRoleFilter = useAdminUsersStore((s) => s.setRoleFilter);
    const setActiveFilter = useAdminUsersStore((s) => s.setActiveFilter);
    const setCoachModeFilter = useAdminUsersStore((s) => s.setCoachModeFilter);

    const setPage = useAdminUsersStore((s) => s.setPage);
    const loadUsers = useAdminUsersStore((s) => s.loadUsers);

    const removeUser = useAdminUsersStore((s) => s.removeUser);
    const purgeUser = useAdminUsersStore((s) => s.purgeUser);

    React.useEffect(() => {
        void loadUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reload when query changes (debounce search)
    const searchDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

        searchDebounceRef.current = setTimeout(() => {
            void loadUsers();
        }, 280);

        return () => {
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, roleFilter, activeFilter, coachModeFilter, page, pageSize]);

    const totalPages = Math.max(1, Math.ceil((total || 0) / (pageSize || 10)));

    const onRefresh = async () => {
        await loadUsers();
    };

    const go = (href: Href) => router.push(href);

    const onNewUser = () => {
        go("/(app)/admin/users/new");
    };

    const onEdit = (user: AdminUser) => {
        router.push({
            pathname: "/(app)/admin/users/[id]",
            params: { id: user.id },
        });
    };

    const onRemove = (user: AdminUser) => {
        Alert.alert(
            "Eliminar usuario",
            `¿Deseas eliminar a "${user.name}"?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        const ok = await removeUser(user.id);
                        if (!ok) Alert.alert("Error", "No se pudo eliminar el usuario.");
                    },
                },
            ],
            { cancelable: true }
        );
    };

    const onPurge = (user: AdminUser) => {
        Alert.alert(
            "Purgar usuario",
            "Esto borrará el usuario y limpiará datos relacionados. Esta acción no se puede deshacer.\n\n¿Continuar?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Purgar",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const result = await purgeUser(user.id);
                            const report = result.cleanup?.items?.length
                                ? `\n\nLimpieza:\n${result.cleanup.items
                                    .map((x) => `• ${x.model}: ${x.deletedCount}`)
                                    .join("\n")}\nTotal: ${result.cleanup.totalDeleted}`
                                : "";
                            Alert.alert("Listo", `${result.message}${report}`);
                        } catch (e: unknown) {
                            Alert.alert("Error", safeText(e));
                        }
                    },
                },
            ]
        );
    };

    const goPrev = () => {
        if (page <= 1) return;
        setPage(page - 1);
    };

    const goNext = () => {
        if (page >= totalPages) return;
        setPage(page + 1);
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
                    <Text style={{ fontSize: 22, fontWeight: "900", color: colors.text }}>Usuarios (Admin)</Text>
                    <Text style={{ color: colors.mutedText }}>
                        Administra usuarios: buscar, filtrar, editar y eliminar.
                    </Text>
                </View>

                <Pressable
                    onPress={onNewUser}
                    style={({ pressed }) => ({
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 12,
                        backgroundColor: colors.primary,
                        opacity: pressed ? 0.92 : 1,
                    })}
                >
                    <Text style={{ color: colors.primaryText, fontWeight: "900" }}>Nuevo usuario</Text>
                </Pressable>
            </View>

            {/* Filters */}
            <AdminUsersFilters
                search={search}
                roleFilter={roleFilter}
                activeFilter={activeFilter}
                coachModeFilter={coachModeFilter}
                onChangeSearch={setSearch}
                onChangeRole={setRoleFilter}
                onChangeActive={setActiveFilter}
                onChangeCoachMode={setCoachModeFilter}
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
                    <Text style={{ fontWeight: "900", color: colors.text }}>Error</Text>
                    <Text style={{ color: colors.mutedText }}>{error}</Text>
                    <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                        Último intento: {formatDateTime(new Date().toISOString())}
                    </Text>
                </View>
            ) : null}

            {/* Loading empty */}
            {loading && items.length === 0 ? (
                <View style={{ paddingVertical: 18, alignItems: "center", gap: 10 }}>
                    <ActivityIndicator />
                    <Text style={{ color: colors.mutedText }}>Cargando usuarios...</Text>
                </View>
            ) : null}

            {/* List */}
            <AdminUsersList items={items} onEdit={onEdit} onRemove={onRemove} onPurge={onPurge} />

            {/* Pagination */}
            <AdminUsersPagination
                page={page}
                totalPages={totalPages}
                total={total}
                pageSize={pageSize}
                onPrev={goPrev}
                onNext={goNext}
            />
        </ScrollView>
    );
}