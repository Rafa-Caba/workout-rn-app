// src/features/routines/components/MovementPickerInline.tsx
import React from "react";
import { FlatList, Image, Modal, Pressable, Text, TextInput, View } from "react-native";

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
    const accent = "#2563EB";
    const bg = props.tone === "primary" ? accent : "transparent";
    const color = props.tone === "primary" ? "#FFFFFF" : "#111827";
    const borderColor = props.tone === "primary" ? accent : "#111827";

    return (
        <Pressable
            onPress={props.onPress}
            disabled={props.disabled}
            style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor,
                backgroundColor: bg,
                opacity: props.disabled ? 0.5 : 1,
            }}
        >
            <Text style={{ fontWeight: "900", color }}>{props.title}</Text>
        </Pressable>
    );
}

function Avatar(props: { name: string; imageUrl?: string | null }) {
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
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <Text style={{ fontWeight: "900" }}>{letter}</Text>
        </View>
    );
}

export function MovementPickerInline({ value, onChange, movements, disabled, title }: Props) {
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
                <Text style={{ fontWeight: "800" }}>{title ?? "Movimiento"}</Text>

                <Pressable
                    onPress={() => setOpen(true)}
                    disabled={disabled}
                    style={{
                        borderWidth: 1,
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                        opacity: disabled ? 0.5 : 1,
                    }}
                >
                    <Text style={{ fontWeight: "800" }}>{selectedLabel}</Text>
                    {value.movementId ? (
                        <Text style={{ color: "#6B7280", marginTop: 4 }} numberOfLines={1}>
                            ID: <Text style={{ fontFamily: "Menlo" }}>{value.movementId}</Text>
                        </Text>
                    ) : null}
                </Pressable>

                {value.movementId ? (
                    <RowButton title="Quitar movimiento" onPress={onClear} disabled={disabled} />
                ) : null}
            </View>

            <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
                <View style={{ flex: 1, padding: 16, gap: 12 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 18, fontWeight: "900" }}>Movimientos</Text>
                            <Text style={{ color: "#6B7280" }}>Selecciona un movimiento</Text>
                        </View>
                        <RowButton title="Cerrar" onPress={() => setOpen(false)} />
                    </View>

                    <TextInput
                        value={q}
                        onChangeText={setQ}
                        placeholder="Buscar..."
                        style={{
                            borderWidth: 1,
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                        }}
                    />

                    <FlatList
                        data={filtered}
                        keyExtractor={(item) => item.id}
                        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                        renderItem={({ item }) => (
                            <Pressable
                                onPress={() => onSelect(item)}
                                style={{
                                    borderWidth: 1,
                                    borderRadius: 14,
                                    padding: 12,
                                    flexDirection: "row",
                                    gap: 12,
                                    alignItems: "center",
                                }}
                            >
                                <Avatar name={item.name} imageUrl={item.imageUrl} />
                                <View style={{ flex: 1, gap: 2 }}>
                                    <Text style={{ fontWeight: "900" }}>{item.name}</Text>
                                    <Text style={{ color: "#6B7280" }} numberOfLines={1}>
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