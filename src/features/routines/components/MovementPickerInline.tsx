// src/features/routines/components/MovementPickerInline.tsx
import React from "react";
import { FlatList, Image, Modal, Pressable, Text, TextInput, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

export type MovementOption = {
    id: string;
    name: string;
    imageUrl?: string | null;
};

type Props = {
    value: { movementId: string | null; movementName: string | null };
    onChange: (next: { movementId: string | null; movementName: string | null }) => void;

    movements: MovementOption[];
    disabled?: boolean;
    title?: string;
};

function RowButton(props: { title: string; onPress: () => void; disabled?: boolean; tone?: "primary" | "neutral" }) {
    const { colors } = useTheme();

    const isPrimary = props.tone === "primary";
    const bg = isPrimary ? colors.primary : colors.surface;
    const color = isPrimary ? colors.primaryText : colors.text;
    const borderColor = isPrimary ? colors.primary : colors.border;

    return (
        <Pressable
            onPress={props.onPress}
            disabled={props.disabled}
            style={({ pressed }) => ({
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor,
                backgroundColor: bg,
                opacity: props.disabled ? 0.5 : pressed ? 0.92 : 1,
            })}
        >
            <Text style={{ fontWeight: "900", color }}>{props.title}</Text>
        </Pressable>
    );
}

function Avatar(props: { name: string; imageUrl?: string | null }) {
    const { colors } = useTheme();

    if (props.imageUrl) {
        return (
            <Image
                source={{ uri: props.imageUrl }}
                style={{ width: 42, height: 42, borderRadius: 10 }}
                resizeMode="cover"
            />
        );
    }

    const letter = props.name.trim().slice(0, 1).toUpperCase() || "?";

    return (
        <View
            style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.background,
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <Text style={{ fontWeight: "900", color: colors.text }}>{letter}</Text>
        </View>
    );
}

export function MovementPickerInline({ value, onChange, movements, disabled, title }: Props) {
    const { colors } = useTheme();

    const [open, setOpen] = React.useState(false);
    const [q, setQ] = React.useState("");

    const selectedLabel = value.movementName ?? "Seleccionar movimiento";

    const filtered = React.useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return movements;
        return movements.filter((m) => m.name.toLowerCase().includes(s));
    }, [q, movements]);

    const onSelect = (m: MovementOption) => {
        onChange({ movementId: m.id, movementName: m.name });
        setOpen(false);
        setQ("");
    };

    const onClear = () => {
        onChange({ movementId: null, movementName: null });
    };

    return (
        <>
            <View style={{ gap: 8 }}>
                <Text style={{ fontWeight: "800", color: colors.text }}>{title ?? "Movimiento"}</Text>

                <Pressable
                    onPress={() => setOpen(true)}
                    disabled={disabled}
                    style={({ pressed }) => ({
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                        opacity: disabled ? 0.5 : pressed ? 0.92 : 1,
                    })}
                >
                    <Text style={{ fontWeight: "800", color: colors.text }}>{selectedLabel}</Text>
                    {value.movementId ? (
                        <Text style={{ color: colors.mutedText, marginTop: 4 }} numberOfLines={1}>
                            ID: <Text style={{ fontFamily: "Menlo", color: colors.text }}>{value.movementId}</Text>
                        </Text>
                    ) : null}
                </Pressable>

                {value.movementId ? <RowButton title="Quitar movimiento" onPress={onClear} disabled={disabled} /> : null}
            </View>

            <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
                <View style={{ flex: 1, padding: 16, gap: 12, backgroundColor: colors.background }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text }}>Movimientos</Text>
                            <Text style={{ color: colors.mutedText }}>Selecciona un movimiento</Text>
                        </View>
                        <RowButton title="Cerrar" onPress={() => setOpen(false)} />
                    </View>

                    <TextInput
                        value={q}
                        onChangeText={setQ}
                        placeholder="Buscar..."
                        placeholderTextColor={colors.mutedText}
                        style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                            color: colors.text,
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            fontWeight: "700",
                        }}
                    />

                    <FlatList
                        data={filtered}
                        keyExtractor={(item) => item.id}
                        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                        renderItem={({ item }) => (
                            <Pressable
                                onPress={() => onSelect(item)}
                                style={({ pressed }) => ({
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    backgroundColor: colors.surface,
                                    borderRadius: 14,
                                    padding: 12,
                                    flexDirection: "row",
                                    gap: 12,
                                    alignItems: "center",
                                    opacity: pressed ? 0.92 : 1,
                                })}
                            >
                                <Avatar name={item.name} imageUrl={item.imageUrl} />
                                <View style={{ flex: 1, gap: 2 }}>
                                    <Text style={{ fontWeight: "900", color: colors.text }}>{item.name}</Text>
                                    <Text style={{ color: colors.mutedText }} numberOfLines={1}>
                                        <Text style={{ fontFamily: "Menlo" }}>{item.id}</Text>
                                    </Text>
                                </View>
                            </Pressable>
                        )}
                    />
                </View>
            </Modal>
        </>
    );
}