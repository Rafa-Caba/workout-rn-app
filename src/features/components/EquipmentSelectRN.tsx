import * as React from "react";
import { FlatList, Modal, Pressable, Text, TextInput, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

export type EquipmentOption = {
    value: string; // stable slug stored in DB
    label: string;
};

type Props = {
    value: string | null;
    onChange: (next: string | null) => void;

    knownOptions?: EquipmentOption[];
    allowOther?: boolean;

    label?: string;
    placeholder?: string;

    otherLabel?: string;
    otherPlaceholder?: string;
    otherHint?: string;

    disabled?: boolean;
};

function normalize(s: string): string {
    return (s ?? "").trim().replace(/\s+/g, " ");
}

function isOtherValue(v: string | null, known: { value: string; label: string }[]) {
    if (!v) return false;
    const norm = normalize(v).toLowerCase();
    return !known.some((k) => normalize(k.value).toLowerCase() === norm || normalize(k.label).toLowerCase() === norm);
}

const DEFAULT_OPTIONS: EquipmentOption[] = [
    { value: "bodyweight", label: "Peso corporal" },
    { value: "dumbbells", label: "Mancuernas" },
    { value: "barbell", label: "Barra" },
    { value: "kettlebell", label: "Kettlebell" },
    { value: "machines", label: "Máquinas" },
    { value: "cable", label: "Polea" },
    { value: "bands", label: "Bandas" },
    { value: "smithMachine", label: "Smith" },
    { value: "trapBar", label: "Trap bar" },
    { value: "bench", label: "Banco" },
    { value: "pullupBar", label: "Barra dominadas" },
    { value: "treadmill", label: "Caminadora" },
    { value: "bike", label: "Bicicleta" },
    { value: "rower", label: "Remo" },
    { value: "elliptical", label: "Elíptica" },
    { value: "medicineBall", label: "Balón medicinal" },
    { value: "foamRoller", label: "Foam roller" },
];

type Item = { kind: "option"; opt: EquipmentOption } | { kind: "other" } | { kind: "clear" };

function buildItems(opts: EquipmentOption[], allowOther: boolean): Item[] {
    const items: Item[] = opts.map((opt) => ({ kind: "option", opt }));
    if (allowOther) items.push({ kind: "other" });
    items.push({ kind: "clear" });
    return items;
}

export function EquipmentSelectRN({
    value,
    onChange,
    knownOptions,
    allowOther = true,

    label = "Equipo",
    placeholder = "Selecciona equipo",

    otherLabel = "Otro (especificar)",
    otherPlaceholder = "Escribe el equipo…",
    otherHint = "Si no está en la lista, escribe uno personalizado.",

    disabled = false,
}: Props) {
    const { colors } = useTheme();

    const opts = React.useMemo(() => {
        const base = (knownOptions?.length ? knownOptions : DEFAULT_OPTIONS).map((o) => ({
            value: normalize(o.value),
            label: normalize(o.label),
        }));

        const map = new Map<string, EquipmentOption>();
        for (const o of base) {
            if (!o.value) continue;
            map.set(o.value, o);
        }
        return Array.from(map.values());
    }, [knownOptions]);

    const matchedKnown = React.useMemo(() => {
        if (!value) return null;
        const norm = normalize(value).toLowerCase();
        return (
            opts.find((o) => normalize(o.value).toLowerCase() === norm) ??
            opts.find((o) => normalize(o.label).toLowerCase() === norm) ??
            null
        );
    }, [value, opts]);

    const [open, setOpen] = React.useState(false);

    const [otherSelected, setOtherSelected] = React.useState<boolean>(() => {
        if (!allowOther) return false;
        if (!value) return false;
        return isOtherValue(value, opts);
    });

    React.useEffect(() => {
        if (!allowOther) {
            setOtherSelected(false);
            return;
        }
        if (matchedKnown) {
            setOtherSelected(false);
            return;
        }
        if (value && isOtherValue(value, opts)) {
            setOtherSelected(true);
            return;
        }
        if (!value) setOtherSelected(false);
    }, [allowOther, matchedKnown, value, opts]);

    const [otherText, setOtherText] = React.useState<string>(() => (otherSelected && value ? value : ""));

    React.useEffect(() => {
        if (otherSelected && value) setOtherText(value);
        if (!otherSelected) setOtherText("");
    }, [otherSelected, value]);

    const displayValue = React.useMemo(() => {
        if (matchedKnown) return matchedKnown.label;
        if (otherSelected && value) return value;
        return null;
    }, [matchedKnown, otherSelected, value]);

    const items = React.useMemo(() => buildItems(opts, allowOther), [opts, allowOther]);

    const onPick = (item: Item) => {
        if (disabled) return;

        if (item.kind === "clear") {
            setOtherSelected(false);
            onChange(null);
            setOpen(false);
            return;
        }

        if (item.kind === "other") {
            setOtherSelected(true);
            const n = normalize(otherText);
            onChange(n ? n : "");
            setOpen(false);
            return;
        }

        setOtherSelected(false);
        onChange(item.opt.value); // ✅ store slug
        setOpen(false);
    };

    const onOtherChange = (txt: string) => {
        setOtherText(txt);
        const n = normalize(txt);
        onChange(n ? n : "");
    };

    return (
        <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 12, color: colors.mutedText, fontWeight: "700" }}>{label}</Text>

            <Pressable
                disabled={disabled}
                onPress={() => setOpen(true)}
                style={({ pressed }) => ({
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    backgroundColor: disabled ? colors.surface : colors.background,
                    opacity: disabled ? 0.7 : pressed ? 0.92 : 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                })}
            >
                <Text style={{ color: displayValue ? colors.text : colors.mutedText, fontWeight: "700" }}>
                    {displayValue ?? placeholder}
                </Text>
                <Text style={{ color: colors.text, fontWeight: "900" }}>▾</Text>
            </Pressable>

            {allowOther && otherSelected ? (
                <View style={{ gap: 6 }}>
                    <TextInput
                        value={otherText}
                        onChangeText={onOtherChange}
                        placeholder={otherPlaceholder}
                        placeholderTextColor={colors.mutedText}
                        editable={!disabled}
                        style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            backgroundColor: disabled ? colors.surface : colors.background,
                            color: colors.text,
                            opacity: disabled ? 0.7 : 1,
                            fontWeight: "700",
                        }}
                    />
                    <Text style={{ fontSize: 12, color: colors.mutedText }}>{otherHint}</Text>
                </View>
            ) : null}

            <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
                <Pressable
                    onPress={() => setOpen(false)}
                    style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", padding: 16, justifyContent: "center" }}
                >
                    <Pressable
                        onPress={() => { }}
                        style={{
                            backgroundColor: colors.surface,
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 16,
                            padding: 12,
                            maxHeight: "70%",
                        }}
                    >
                        <Text style={{ fontWeight: "900", fontSize: 16, marginBottom: 10, color: colors.text }}>{label}</Text>

                        <FlatList
                            data={items}
                            keyExtractor={(it, idx) => `${it.kind}_${(it as any).opt?.value ?? idx}`}
                            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                            renderItem={({ item }) => {
                                const text =
                                    item.kind === "option" ? item.opt.label : item.kind === "other" ? otherLabel : "Limpiar";

                                const isSelected =
                                    item.kind === "option"
                                        ? normalize(value ?? "").toLowerCase() === normalize(item.opt.value).toLowerCase()
                                        : item.kind === "other"
                                            ? otherSelected
                                            : value == null;

                                return (
                                    <Pressable
                                        onPress={() => onPick(item)}
                                        style={({ pressed }) => ({
                                            paddingVertical: 12,
                                            paddingHorizontal: 12,
                                            borderRadius: 12,
                                            borderWidth: 1,
                                            borderColor: isSelected ? colors.primary : colors.border,
                                            backgroundColor: colors.background,
                                            opacity: pressed ? 0.92 : 1,
                                        })}
                                    >
                                        <Text style={{ fontWeight: "800", color: colors.text }}>{text}</Text>
                                    </Pressable>
                                );
                            }}
                        />
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}