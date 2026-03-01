// src/features/admin/users/components/AdminUsersFilters.tsx
import React from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type {
    AdminUserActiveFilter,
    AdminUserRoleFilter,
} from "@/src/types/adminUser.types";

type CoachModeFilter = "all" | "NONE" | "TRAINER" | "TRAINEE";

function Label({ text }: { text: string }) {
    const { colors } = useTheme();
    return <Text style={{ color: colors.mutedText, fontWeight: "900", fontSize: 12 }}>{text}</Text>;
}

function SelectModal<T extends string>(props: {
    visible: boolean;
    title: string;
    options: { label: string; value: T }[];
    value: T;
    onSelect: (v: T) => void;
    onClose: () => void;
}) {
    const { colors } = useTheme();

    return (
        <Modal transparent animationType="fade" visible={props.visible} onRequestClose={props.onClose}>
            <Pressable
                onPress={props.onClose}
                style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.28)", padding: 16, justifyContent: "center" }}
            >
                <Pressable
                    onPress={() => undefined}
                    style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 16,
                        backgroundColor: colors.surface,
                        padding: 14,
                        gap: 10,
                    }}
                >
                    <Text style={{ fontWeight: "900", color: colors.text, fontSize: 16 }}>{props.title}</Text>

                    {props.options.map((o) => {
                        const active = o.value === props.value;
                        return (
                            <Pressable
                                key={o.value}
                                onPress={() => props.onSelect(o.value)}
                                style={({ pressed }) => ({
                                    paddingHorizontal: 12,
                                    paddingVertical: 12,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: active ? colors.primary : colors.border,
                                    backgroundColor: pressed ? colors.background : colors.surface,
                                    opacity: pressed ? 0.92 : 1,
                                })}
                            >
                                <Text style={{ fontWeight: "900", color: colors.text }}>{o.label}</Text>
                            </Pressable>
                        );
                    })}

                    <Pressable
                        onPress={props.onClose}
                        style={({ pressed }) => ({
                            marginTop: 4,
                            paddingVertical: 12,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: pressed ? colors.background : colors.surface,
                            alignItems: "center",
                            opacity: pressed ? 0.92 : 1,
                        })}
                    >
                        <Text style={{ fontWeight: "900", color: colors.text }}>Cerrar</Text>
                    </Pressable>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

function SelectRow(props: { label: string; valueLabel: string; onPress: () => void }) {
    const { colors } = useTheme();
    return (
        <Pressable
            onPress={props.onPress}
            style={({ pressed }) => ({
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 12,
                backgroundColor: pressed ? colors.background : colors.surface,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                opacity: pressed ? 0.92 : 1,
            })}
        >
            <Text style={{ fontWeight: "900", color: colors.text }}>{props.label}</Text>
            <Text style={{ fontWeight: "900", color: colors.mutedText }}>{props.valueLabel}</Text>
        </Pressable>
    );
}

export function AdminUsersFilters(props: {
    search: string;
    roleFilter: AdminUserRoleFilter;
    activeFilter: AdminUserActiveFilter;
    coachModeFilter: CoachModeFilter;

    onChangeSearch: (v: string) => void;
    onChangeRole: (v: AdminUserRoleFilter) => void;
    onChangeActive: (v: AdminUserActiveFilter) => void;
    onChangeCoachMode: (v: CoachModeFilter) => void;
}) {
    const { colors } = useTheme();

    const [roleOpen, setRoleOpen] = React.useState(false);
    const [activeOpen, setActiveOpen] = React.useState(false);
    const [coachOpen, setCoachOpen] = React.useState(false);

    const roleLabel =
        props.roleFilter === "all" ? "Todos" : props.roleFilter === "admin" ? "Admin" : "Usuario";

    const activeLabel =
        props.activeFilter === "all" ? "Todos" : props.activeFilter === "active" ? "Activos" : "Inactivos";

    const coachLabel =
        props.coachModeFilter === "all"
            ? "Todos"
            : props.coachModeFilter === "NONE"
                ? "Regular"
                : props.coachModeFilter === "TRAINER"
                    ? "Trainer"
                    : "Trainee";

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
            <Text style={{ fontWeight: "900", color: colors.text, fontSize: 16 }}>Filtros</Text>

            <View style={{ gap: 6 }}>
                <Label text="Buscar" />
                <TextInput
                    value={props.search}
                    onChangeText={props.onChangeSearch}
                    placeholder="Nombre o email..."
                    placeholderTextColor={colors.mutedText}
                    style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        color: colors.text,
                        backgroundColor: colors.background,
                        fontWeight: "700",
                    }}
                />
            </View>

            <View style={{ gap: 8 }}>
                <SelectRow label="Rol" valueLabel={roleLabel} onPress={() => setRoleOpen(true)} />
                <SelectRow label="Estado" valueLabel={activeLabel} onPress={() => setActiveOpen(true)} />
                <SelectRow label="Coaching" valueLabel={coachLabel} onPress={() => setCoachOpen(true)} />
            </View>

            <SelectModal<AdminUserRoleFilter>
                visible={roleOpen}
                title="Rol"
                value={props.roleFilter}
                onClose={() => setRoleOpen(false)}
                onSelect={(v) => {
                    props.onChangeRole(v);
                    setRoleOpen(false);
                }}
                options={[
                    { label: "Todos", value: "all" },
                    { label: "Admin", value: "admin" },
                    { label: "Usuario", value: "user" },
                ]}
            />

            <SelectModal<AdminUserActiveFilter>
                visible={activeOpen}
                title="Estado"
                value={props.activeFilter}
                onClose={() => setActiveOpen(false)}
                onSelect={(v) => {
                    props.onChangeActive(v);
                    setActiveOpen(false);
                }}
                options={[
                    { label: "Todos", value: "all" },
                    { label: "Activos", value: "active" },
                    { label: "Inactivos", value: "inactive" },
                ]}
            />

            <SelectModal<CoachModeFilter>
                visible={coachOpen}
                title="Coaching"
                value={props.coachModeFilter}
                onClose={() => setCoachOpen(false)}
                onSelect={(v) => {
                    props.onChangeCoachMode(v);
                    setCoachOpen(false);
                }}
                options={[
                    { label: "Todos", value: "all" },
                    { label: "Regular (NONE)", value: "NONE" },
                    { label: "Trainer", value: "TRAINER" },
                    { label: "Trainee", value: "TRAINEE" },
                ]}
            />
        </View>
    );
}