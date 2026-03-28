// /src/features/components/MuscleGroupSelectRN.tsx
import * as React from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

export type MuscleGroupOption = {
    value: string;
    label: string;
};

type Props = {
    value: string[];
    onChange: (next: string[]) => void;
    knownOptions?: MuscleGroupOption[];
    allowOther?: boolean;
    label?: string;
    placeholder?: string;
    otherLabel?: string;
    otherPlaceholder?: string;
    otherHint?: string;
    disabled?: boolean;
};

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

function normalize(value: string): string {
    return value.trim().replace(/\s+/g, " ");
}

function uniqueStrings(values: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];

    values.forEach((value) => {
        const normalized = normalize(value);
        if (!normalized) {
            return;
        }

        const key = normalized.toLowerCase();
        if (seen.has(key)) {
            return;
        }

        seen.add(key);
        result.push(normalized);
    });

    return result;
}

export function MuscleGroupSelectRN({
    value,
    onChange,
    knownOptions,
    allowOther = true,
    label = "Grupo muscular",
    placeholder = "Selecciona grupos",
    otherLabel = "Agregar otro grupo",
    otherPlaceholder = "Escribe el grupo…",
    otherHint = "Si no está en la lista, agrégalo manualmente.",
    disabled = false,
}: Props) {
    const { colors } = useTheme();
    const [open, setOpen] = React.useState(false);
    const [otherText, setOtherText] = React.useState("");

    const options = React.useMemo(() => {
        const source = knownOptions?.length ? knownOptions : DEFAULT_OPTIONS;
        const map = new Map<string, MuscleGroupOption>();

        source.forEach((option) => {
            const normalizedValue = normalize(option.value);
            const normalizedLabel = normalize(option.label);

            if (!normalizedValue) {
                return;
            }

            map.set(normalizedValue.toLowerCase(), {
                value: normalizedValue,
                label: normalizedLabel || normalizedValue,
            });
        });

        return Array.from(map.values());
    }, [knownOptions]);

    const selectedValues = React.useMemo(() => uniqueStrings(value), [value]);

    const selectedKnownMap = React.useMemo(() => {
        const map = new Map<string, MuscleGroupOption>();
        options.forEach((option) => {
            map.set(option.value.toLowerCase(), option);
        });
        return map;
    }, [options]);

    const customValues = React.useMemo(() => {
        return selectedValues.filter((item) => !selectedKnownMap.has(item.toLowerCase()));
    }, [selectedKnownMap, selectedValues]);

    const displayValue = React.useMemo(() => {
        if (!selectedValues.length) {
            return null;
        }

        return selectedValues
            .map((item) => selectedKnownMap.get(item.toLowerCase())?.label ?? item)
            .join(", ");
    }, [selectedKnownMap, selectedValues]);

    function toggleOption(optionValue: string) {
        if (disabled) {
            return;
        }

        const normalizedValue = normalize(optionValue);
        const exists = selectedValues.some(
            (item) => item.toLowerCase() === normalizedValue.toLowerCase()
        );

        const next = exists
            ? selectedValues.filter((item) => item.toLowerCase() !== normalizedValue.toLowerCase())
            : [...selectedValues, normalizedValue];

        onChange(uniqueStrings(next));
    }

    function removeValue(valueToRemove: string) {
        if (disabled) {
            return;
        }

        onChange(
            selectedValues.filter(
                (item) => item.toLowerCase() !== valueToRemove.toLowerCase()
            )
        );
    }

    function clearAll() {
        if (disabled) {
            return;
        }

        onChange([]);
        setOtherText("");
    }

    function addOther() {
        if (disabled) {
            return;
        }

        const normalized = normalize(otherText);
        if (!normalized) {
            return;
        }

        onChange(uniqueStrings([...selectedValues, normalized]));
        setOtherText("");
    }

    return (
        <View style={{ gap: 8 }}>
            {label ? (
                <Text style={{ fontSize: 12, color: colors.mutedText, fontWeight: "700" }}>
                    {label}
                </Text>
            ) : null}

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
                <Text
                    numberOfLines={2}
                    style={{
                        flex: 1,
                        color: displayValue ? colors.text : colors.mutedText,
                        fontWeight: "700",
                    }}
                >
                    {displayValue ?? placeholder}
                </Text>
                <Text style={{ color: colors.text, fontWeight: "900", marginLeft: 10 }}>▾</Text>
            </Pressable>

            {selectedValues.length ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {selectedValues.map((item) => {
                        const labelText = selectedKnownMap.get(item.toLowerCase())?.label ?? item;

                        return (
                            <Pressable
                                key={item.toLowerCase()}
                                onPress={() => removeValue(item)}
                                disabled={disabled}
                                style={{
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    backgroundColor: colors.background,
                                    borderRadius: 999,
                                    paddingHorizontal: 10,
                                    paddingVertical: 6,
                                }}
                            >
                                <Text style={{ color: colors.text, fontWeight: "700" }}>
                                    {labelText} ✕
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            ) : null}

            <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
                <Pressable
                    onPress={() => setOpen(false)}
                    style={{
                        flex: 1,
                        backgroundColor: "rgba(0,0,0,0.35)",
                        padding: 16,
                        justifyContent: "center",
                    }}
                >
                    <Pressable
                        onPress={() => undefined}
                        style={{
                            backgroundColor: colors.surface,
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 16,
                            padding: 12,
                            maxHeight: "78%",
                            gap: 12,
                        }}
                    >
                        <Text style={{ fontWeight: "900", fontSize: 16, color: colors.text }}>
                            {label || "Grupo muscular"}
                        </Text>

                        <ScrollView contentContainerStyle={{ gap: 8 }}>
                            {options.map((option) => {
                                const selected = selectedValues.some(
                                    (item) => item.toLowerCase() === option.value.toLowerCase()
                                );

                                return (
                                    <Pressable
                                        key={option.value}
                                        onPress={() => toggleOption(option.value)}
                                        style={({ pressed }) => ({
                                            paddingVertical: 12,
                                            paddingHorizontal: 12,
                                            borderRadius: 12,
                                            borderWidth: 1,
                                            borderColor: selected ? colors.primary : colors.border,
                                            backgroundColor: colors.background,
                                            opacity: pressed ? 0.92 : 1,
                                            flexDirection: "row",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: 10,
                                        })}
                                    >
                                        <Text style={{ fontWeight: "800", color: colors.text, flex: 1 }}>
                                            {option.label}
                                        </Text>
                                        <Text style={{ color: selected ? colors.primary : colors.mutedText, fontWeight: "900" }}>
                                            {selected ? "✓" : "○"}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>

                        {allowOther ? (
                            <View style={{ gap: 8 }}>
                                <Text style={{ fontSize: 12, color: colors.mutedText, fontWeight: "700" }}>
                                    {otherLabel}
                                </Text>

                                <View style={{ flexDirection: "row", gap: 8 }}>
                                    <TextInput
                                        value={otherText}
                                        onChangeText={setOtherText}
                                        placeholder={otherPlaceholder}
                                        placeholderTextColor={colors.mutedText}
                                        editable={!disabled}
                                        style={{
                                            flex: 1,
                                            borderWidth: 1,
                                            borderColor: colors.border,
                                            borderRadius: 12,
                                            paddingHorizontal: 12,
                                            paddingVertical: 10,
                                            backgroundColor: colors.background,
                                            color: colors.text,
                                            fontWeight: "700",
                                        }}
                                    />

                                    <Pressable
                                        onPress={addOther}
                                        style={({ pressed }) => ({
                                            borderRadius: 12,
                                            paddingHorizontal: 14,
                                            paddingVertical: 10,
                                            backgroundColor: colors.primary,
                                            opacity: pressed ? 0.92 : 1,
                                            alignItems: "center",
                                            justifyContent: "center",
                                        })}
                                    >
                                        <Text style={{ color: colors.primaryText, fontWeight: "800" }}>
                                            Agregar
                                        </Text>
                                    </Pressable>
                                </View>

                                <Text style={{ fontSize: 12, color: colors.mutedText }}>
                                    {otherHint}
                                </Text>
                            </View>
                        ) : null}

                        {customValues.length ? (
                            <View style={{ gap: 6 }}>
                                <Text style={{ fontSize: 12, color: colors.mutedText, fontWeight: "700" }}>
                                    Personalizados
                                </Text>
                                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                                    {customValues.map((item) => (
                                        <Pressable
                                            key={item.toLowerCase()}
                                            onPress={() => removeValue(item)}
                                            style={{
                                                borderWidth: 1,
                                                borderColor: colors.border,
                                                backgroundColor: colors.background,
                                                borderRadius: 999,
                                                paddingHorizontal: 10,
                                                paddingVertical: 6,
                                            }}
                                        >
                                            <Text style={{ color: colors.text, fontWeight: "700" }}>
                                                {item} ✕
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>
                        ) : null}

                        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                            <Pressable
                                onPress={clearAll}
                                style={({ pressed }) => ({
                                    paddingHorizontal: 14,
                                    paddingVertical: 10,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    backgroundColor: colors.background,
                                    opacity: pressed ? 0.92 : 1,
                                })}
                            >
                                <Text style={{ color: colors.mutedText, fontWeight: "800" }}>
                                    Limpiar
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={() => setOpen(false)}
                                style={({ pressed }) => ({
                                    paddingHorizontal: 14,
                                    paddingVertical: 10,
                                    borderRadius: 12,
                                    backgroundColor: colors.primary,
                                    opacity: pressed ? 0.92 : 1,
                                })}
                            >
                                <Text style={{ color: colors.primaryText, fontWeight: "800" }}>
                                    Listo
                                </Text>
                            </Pressable>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}