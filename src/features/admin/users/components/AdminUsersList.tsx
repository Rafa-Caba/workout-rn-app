// src/features/admin/users/components/AdminUsersList.tsx
import React from "react";
import { FlatList, Image, Pressable, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { AdminUser } from "@/src/types/adminUser.types";

function initialsFromName(name: string): string {
    const parts = String(name ?? "").trim().split(/\s+/g).filter(Boolean);
    const a = parts[0]?.[0] ?? "";
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
    const out = `${a}${b}`.toUpperCase();
    return out || "U";
}

function formatDateTime(iso: string | null): string {
    const s = String(iso ?? "").trim();
    if (!s) return "—";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleString();
}

function Pill(props: { text: string; tone?: "default" | "good" | "bad" }) {
    const { colors } = useTheme();

    const bg =
        props.tone === "good"
            ? colors.primary
            : props.tone === "bad"
                ? "#EF4444"
                : colors.mutedText;

    const fg = props.tone === "default" ? colors.text : colors.primaryText;

    return (
        <View
            style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: bg,
            }}
        >
            <Text style={{ fontWeight: "900", color: fg, fontSize: 12 }}>{props.text}</Text>
        </View>
    );
}

function ActionButton(props: { label: string; onPress: () => void; danger?: boolean }) {
    const { colors } = useTheme();

    return (
        <Pressable
            onPress={props.onPress}
            style={({ pressed }) => ({
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: pressed ? colors.background : colors.surface,
                opacity: pressed ? 0.92 : 1,
            })}
        >
            <Text style={{ fontWeight: "900", color: props.danger ? "#EF4444" : colors.text }}>
                {props.label}
            </Text>
        </Pressable>
    );
}

function UserCard(props: {
    user: AdminUser;
    onEdit: (u: AdminUser) => void;
    onRemove: (u: AdminUser) => void;
    onPurge: (u: AdminUser) => void;
}) {
    const { colors } = useTheme();
    const u = props.user;

    const avatarUrl = u.profilePicUrl?.trim() ? u.profilePicUrl.trim() : null;
    const initials = initialsFromName(u.name);

    return (
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
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                <View
                    style={{
                        height: 54,
                        width: 54,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                        overflow: "hidden",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={{ height: "100%", width: "100%" }} resizeMode="cover" />
                    ) : (
                        <Text style={{ fontWeight: "900", color: colors.mutedText }}>{initials}</Text>
                    )}
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontWeight: "900", color: colors.text, fontSize: 16 }}>{u.name}</Text>
                    <Text style={{ color: colors.mutedText, fontWeight: "800" }}>{u.email}</Text>
                    <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                        Último acceso: {formatDateTime(u.lastLoginAt)}
                    </Text>
                </View>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Pill text={u.role === "admin" ? "admin" : "user"} />
                <Pill text={u.coachMode === "NONE" ? "REGULAR" : u.coachMode} />
                <Pill text={u.isActive ? "Activo" : "Inactivo"} tone={u.isActive ? "good" : "bad"} />
            </View>

            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                <ActionButton label="Editar" onPress={() => props.onEdit(u)} />
                <ActionButton label="Eliminar" onPress={() => props.onRemove(u)} danger />
                <ActionButton label="Purgar" onPress={() => props.onPurge(u)} danger />
            </View>
        </View>
    );
}

export function AdminUsersList(props: {
    items: AdminUser[];
    onEdit: (u: AdminUser) => void;
    onRemove: (u: AdminUser) => void;
    onPurge: (u: AdminUser) => void;
}) {
    const { colors } = useTheme();

    if (props.items.length === 0) {
        return (
            <View
                style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    borderRadius: 16,
                    padding: 14,
                    gap: 8,
                    alignItems: "center",
                }}
            >
                <Text style={{ fontWeight: "900", color: colors.text }}>Sin resultados</Text>
                <Text style={{ color: colors.mutedText, textAlign: "center" }}>
                    No hay usuarios con los filtros actuales.
                </Text>
            </View>
        );
    }

    return (
        <FlatList
            data={props.items}
            keyExtractor={(u) => u.id}
            scrollEnabled={false}
            contentContainerStyle={{ gap: 10 }}
            renderItem={({ item }) => (
                <UserCard user={item} onEdit={props.onEdit} onRemove={props.onRemove} onPurge={props.onPurge} />
            )}
        />
    );
}