import * as React from "react";
import { FlatList, Modal, Pressable, Text, TextInput, View } from "react-native";

export type MuscleGroupOption = {
    value: string; // stable slug stored in DB
    label: string; // display label
};

type Props = {
    value: string | null;
    onChange: (next: string | null) => void;

    knownOptions?: MuscleGroupOption[];
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
    return !known.some(
        (k) =>
            normalize(k.value).toLowerCase() === norm || normalize(k.label).toLowerCase() === norm
    );
}

const DEFAULT_OPTIONS: MuscleGroupOption[] = [
    { value: "chest", label: "Pecho" },
    { value: "back", label: "Espalda" },
    { value: "shoulders", label: "Hombros" },
    { value: "biceps", label: "Bíceps" },
    { value: "triceps", label: "Tríceps" },
    { value: "quads", label: "Cuádriceps" },
    { value: "hamstrings", label: "Isquios" },
    { value: "glutes", label: "Glúteos" },
    { value: "calves", label: "Pantorrillas" },
    { value: "core", label: "Core" },
    { value: "abs", label: "Abdomen" },
    { value: "fullBody", label: "Cuerpo completo" },
    { value: "cardio", label: "Cardio" },
    { value: "mobility", label: "Movilidad" },
];

type Item =
    | { kind: "option"; opt: MuscleGroupOption }
    | { kind: "other" }
    | { kind: "clear" };

function buildItems(opts: MuscleGroupOption[], allowOther: boolean): Item[] {
    const items: Item[] = opts.map((opt) => ({ kind: "option", opt }));
    if (allowOther) items.push({ kind: "other" });
    items.push({ kind: "clear" });
    return items;
}

export function MuscleGroupSelectRN({
    value,
    onChange,
    knownOptions,
    allowOther = true,

    label = "Grupo muscular",
    placeholder = "Selecciona un grupo",

    otherLabel = "Otro (especificar)",
    otherPlaceholder = "Escribe el grupo…",
    otherHint = "Si no está en la lista, escribe uno personalizado.",

    disabled = false,
}: Props) {
    const opts = React.useMemo(() => {
        const base = (knownOptions?.length ? knownOptions : DEFAULT_OPTIONS).map((o) => ({
            value: normalize(o.value),
            label: normalize(o.label),
        }));

        const map = new Map<string, MuscleGroupOption>();
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
            <Text style={{ fontSize: 12, color: "#6B7280", fontWeight: "700" }}>{label}</Text>

            <Pressable
                disabled={disabled}
                onPress={() => setOpen(true)}
                style={{
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    backgroundColor: disabled ? "#F3F4F6" : "white",
                    opacity: disabled ? 0.7 : 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <Text style={{ color: displayValue ? "#111827" : "#6B7280", fontWeight: "700" }}>
                    {displayValue ?? placeholder}
                </Text>
                <Text style={{ color: "#111827", fontWeight: "900" }}>▾</Text>
            </Pressable>

            {allowOther && otherSelected ? (
                <View style={{ gap: 6 }}>
                    <TextInput
                        value={otherText}
                        onChangeText={onOtherChange}
                        placeholder={otherPlaceholder}
                        editable={!disabled}
                        style={{
                            borderWidth: 1,
                            borderColor: "#E5E7EB",
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            backgroundColor: disabled ? "#F3F4F6" : "white",
                            color: "#111827",
                            opacity: disabled ? 0.7 : 1,
                        }}
                    />
                    <Text style={{ fontSize: 12, color: "#6B7280" }}>{otherHint}</Text>
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
                            backgroundColor: "white",
                            borderRadius: 16,
                            padding: 12,
                            maxHeight: "70%",
                        }}
                    >
                        <Text style={{ fontWeight: "900", fontSize: 16, marginBottom: 10 }}>{label}</Text>

                        <FlatList
                            data={items}
                            keyExtractor={(it, idx) => `${it.kind}_${(it as any).opt?.value ?? idx}`}
                            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                            renderItem={({ item }) => {
                                const text =
                                    item.kind === "option"
                                        ? item.opt.label
                                        : item.kind === "other"
                                            ? otherLabel
                                            : "Limpiar";
                                const isSelected =
                                    item.kind === "option"
                                        ? normalize(value ?? "").toLowerCase() === normalize(item.opt.value).toLowerCase()
                                        : item.kind === "other"
                                            ? otherSelected
                                            : value == null;

                                return (
                                    <Pressable
                                        onPress={() => onPick(item)}
                                        style={{
                                            paddingVertical: 12,
                                            paddingHorizontal: 12,
                                            borderRadius: 12,
                                            borderWidth: 1,
                                            borderColor: isSelected ? "#2563EB" : "#E5E7EB",
                                            backgroundColor: isSelected ? "rgba(37, 99, 235, 0.08)" : "white",
                                        }}
                                    >
                                        <Text style={{ fontWeight: "800", color: "#111827" }}>{text}</Text>
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