// src/features/trainer/components/TrainerTraineePicker.tsx
import React from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { PublicUser } from "@/src/types/auth.types";

type Item = {
    id: string;
    name: string;
    subtitle: string | null;
};

type Props = {
    valueId: string;
    items: Item[];
    loading?: boolean;
    error?: boolean;

    onSelect: (id: string) => void;
    onClear: () => void;
    onRetry?: () => void;
};

function toName(u: PublicUser): string {
    const anyU: any = u as any;
    return (typeof anyU?.name === "string" && anyU.name.trim()) ? anyU.name : "Usuario";
}

function toSubtitle(u: PublicUser): string | null {
    const anyU: any = u as any;
    const email = typeof anyU?.email === "string" ? anyU.email : null;
    return email && email.trim() ? email : null;
}

export function normalizeTrainees(list: PublicUser[]): Item[] {
    return (list ?? []).map((u) => {
        const anyU: any = u as any;
        return {
            id: String(anyU?.id ?? anyU?._id ?? ""),
            name: toName(u),
            subtitle: toSubtitle(u),
        };
    }).filter((x) => Boolean(x.id));
}

export function TrainerTraineePicker(props: Props) {
    const { colors } = useTheme();
    const [open, setOpen] = React.useState(false);

    const selected = React.useMemo(() => {
        if (!props.valueId) return null;
        return props.items.find((x) => x.id === props.valueId) ?? null;
    }, [props.valueId, props.items]);

    const label = props.loading
        ? "Cargando trainees…"
        : selected?.name
            ? selected.name
            : "Selecciona un trainee";

    return (
        <>
            <Pressable
                onPress={() => setOpen(true)}
                disabled={props.loading}
                style={({ pressed }) => ({
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                    opacity: props.loading ? 0.6 : pressed ? 0.92 : 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "70%",
                    gap: 10,
                })}
            >
                <Text style={{ color: colors.text, fontWeight: "900", flex: 1 }} numberOfLines={1}>
                    {label}
                </Text>
                <Text style={{ color: colors.mutedText, fontWeight: "800" }}>▾</Text>
            </Pressable>

            <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
                <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />

                <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                        <Text style={{ fontWeight: "900", color: colors.text, fontSize: 16 }}>Selecciona un trainee</Text>
                        <Pressable onPress={() => setOpen(false)}>
                            <Text style={{ fontWeight: "900", color: colors.mutedText }}>Cerrar</Text>
                        </Pressable>
                    </View>

                    <View style={{ height: 10 }} />

                    {props.error ? (
                        <Pressable
                            onPress={() => props.onRetry?.()}
                            style={({ pressed }) => ({
                                padding: 12,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: colors.border,
                                backgroundColor: colors.background,
                                opacity: pressed ? 0.92 : 1,
                            })}
                        >
                            <Text style={{ color: colors.text, fontWeight: "900" }}>
                                Error al cargar. Toca para reintentar.
                            </Text>
                        </Pressable>
                    ) : props.items.length === 0 ? (
                        <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.background }]}>
                            <Text style={{ color: colors.mutedText, fontWeight: "900" }}>Aún no hay trainees asignados</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={props.items}
                            keyExtractor={(it) => it.id}
                            style={{ maxHeight: 360 }}
                            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                            renderItem={({ item }) => {
                                const active = item.id === props.valueId;
                                return (
                                    <Pressable
                                        onPress={() => {
                                            props.onSelect(item.id);
                                            setOpen(false);
                                        }}
                                        style={({ pressed }) => ({
                                            padding: 12,
                                            borderRadius: 12,
                                            borderWidth: 1,
                                            borderColor: colors.border,
                                            backgroundColor: active ? colors.primary : colors.background,
                                            opacity: pressed ? 0.92 : 1,
                                        })}
                                    >
                                        <Text style={{ color: active ? "#fff" : colors.text, fontWeight: "900" }} numberOfLines={1}>
                                            {item.name}
                                        </Text>
                                        {item.subtitle ? (
                                            <Text style={{ color: active ? "#fff" : colors.mutedText, fontWeight: "700" }} numberOfLines={1}>
                                                {item.subtitle}
                                            </Text>
                                        ) : null}
                                    </Pressable>
                                );
                            }}
                        />
                    )}

                    {props.valueId ? (
                        <>
                            <View style={{ height: 10 }} />
                            <Pressable
                                onPress={() => {
                                    props.onClear();
                                    setOpen(false);
                                }}
                                style={({ pressed }) => ({
                                    padding: 12,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    backgroundColor: colors.background,
                                    opacity: pressed ? 0.92 : 1,
                                })}
                            >
                                <Text style={{ color: colors.text, fontWeight: "900" }}>Limpiar selección</Text>
                            </Pressable>
                        </>
                    ) : null}
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        position: "absolute",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.35)",
    },
    sheet: {
        position: "absolute",
        left: 16,
        right: 16,
        top: 80,
        borderRadius: 16,
        borderWidth: 1,
        padding: 12,
        gap: 6,
    },
    empty: {
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
        alignItems: "center",
        justifyContent: "center",
    },
});