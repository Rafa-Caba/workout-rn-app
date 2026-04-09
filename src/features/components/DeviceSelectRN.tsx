import * as React from "react";
import { FlatList, Modal, Pressable, Text, TextInput, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

type Props = {
    value: string | null;
    onChange: (next: string | null) => void;

    knownOptions?: string[];
    allowOther?: boolean;

    label?: string;
    placeholder?: string;

    otherLabel?: string;
    otherPlaceholder?: string;
    otherHint?: string;

    disabled?: boolean;

    // ✅ Added (UI only)
    onOpen?: () => void;
    onClose?: () => void;
};

function normalize(s: string): string {
    return (s ?? "").trim().replace(/\s+/g, " ");
}

function isOtherValue(v: string | null, known: string[]) {
    if (!v) return false;
    const norm = normalize(v).toLowerCase();
    return !known.some((k) => normalize(k).toLowerCase() === norm);
}

const DEFAULT_DEVICES = [
    "Apple Watch",
    "iPhone",
    "iPad",
    "Mac (HealthKit)",
    "Garmin (Watch)",
    "Garmin Connect",
    "Android Phone",
    "Google Fit",
    "Fitbit",
    "Fitbit Charge",
    "Fitbit Versa",
    "Fitbit Sense",
    "Oura Ring",
    "WHOOP",
    "Polar (Watch)",
    "Suunto (Watch)",
    "COROS (Watch)",
    "Samsung Galaxy Watch",
    "Xiaomi Mi Band",
    "Huawei Watch",
    "Withings",
    "Strava",
    "Manual",
].map(normalize);

type Item = { kind: "option"; label: string } | { kind: "other" } | { kind: "clear" };

function buildItems(known: string[], allowOther: boolean): Item[] {
    const opts = Array.from(new Set(known.map(normalize).filter(Boolean)));
    const items: Item[] = opts.map((label) => ({ kind: "option", label }));
    if (allowOther) items.push({ kind: "other" });
    items.push({ kind: "clear" });
    return items;
}

export function DeviceSelectRN({
    value,
    onChange,
    knownOptions,
    allowOther = true,

    label = "Dispositivo",
    placeholder = "Selecciona un dispositivo",

    otherLabel = "Otro (especificar)",
    otherPlaceholder = "Escribe el dispositivo…",
    otherHint = "Ej: Apple Watch SE, Garmin Forerunner, etc.",

    disabled = false,

    onOpen,
    onClose,
}: Props) {
    const { colors } = useTheme();

    const known = React.useMemo(() => {
        const base = (knownOptions?.length ? knownOptions : DEFAULT_DEVICES).map(normalize).filter(Boolean);
        return Array.from(new Set(base));
    }, [knownOptions]);

    const matchedKnown = React.useMemo(() => {
        if (!value) return null;
        const norm = normalize(value).toLowerCase();
        return known.find((k) => normalize(k).toLowerCase() === norm) ?? null;
    }, [value, known]);

    const [open, setOpen] = React.useState(false);

    const closeModal = React.useCallback(() => {
        setOpen(false);
        onClose?.();
    }, [onClose]);

    const openModal = React.useCallback(() => {
        if (disabled) return;
        setOpen(true);
        onOpen?.();
    }, [disabled, onOpen]);

    const [otherSelected, setOtherSelected] = React.useState<boolean>(() => {
        if (!allowOther) return false;
        if (!value) return false;
        return isOtherValue(value, known);
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
        if (value && isOtherValue(value, known)) {
            setOtherSelected(true);
            return;
        }
        if (!value) setOtherSelected(false);
    }, [allowOther, matchedKnown, value, known]);

    const [otherText, setOtherText] = React.useState<string>(() => (otherSelected && value ? value : ""));

    React.useEffect(() => {
        if (otherSelected && value) setOtherText(value);
        if (!otherSelected) setOtherText("");
    }, [otherSelected, value]);

    const displayValue = React.useMemo(() => {
        if (matchedKnown) return matchedKnown;
        if (otherSelected && value) return value;
        return null;
    }, [matchedKnown, otherSelected, value]);

    const items = React.useMemo(() => buildItems(known, allowOther), [known, allowOther]);

    const onPick = (item: Item) => {
        if (disabled) return;

        if (item.kind === "clear") {
            setOtherSelected(false);
            onChange(null);
            closeModal();
            return;
        }

        if (item.kind === "other") {
            setOtherSelected(true);
            const n = normalize(otherText);
            onChange(n ? n : "");
            closeModal();
            return;
        }

        setOtherSelected(false);
        onChange(item.label);
        closeModal();
    };

    const onOtherChange = (txt: string) => {
        setOtherText(txt);
        const n = normalize(txt);
        onChange(n ? n : "");
    };

    return (
        <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, color: colors.mutedText, fontWeight: "700" }}>{label}</Text>

            <Pressable
                disabled={disabled}
                onPress={openModal}
                style={({ pressed }) => ({
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 9,
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
                <Text style={{ color: colors.text, fontWeight: "800" }}>▾</Text>
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

            <Modal visible={open} transparent animationType="fade" onRequestClose={closeModal}>
                <Pressable
                    onPress={closeModal}
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
                        <Text style={{ fontWeight: "800", fontSize: 16, marginBottom: 10, color: colors.text }}>
                            {label}
                        </Text>

                        <FlatList
                            data={items}
                            keyExtractor={(it, idx) => `${it.kind}_${(it as any).label ?? idx}`}
                            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                            renderItem={({ item }) => {
                                const text =
                                    item.kind === "option"
                                        ? item.label
                                        : item.kind === "other"
                                            ? otherLabel
                                            : "Limpiar";

                                const isSelected =
                                    item.kind === "option"
                                        ? normalize(value ?? "").toLowerCase() === normalize(item.label).toLowerCase()
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