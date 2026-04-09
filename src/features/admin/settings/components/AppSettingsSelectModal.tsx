// src/features/admin/settings/components/AppSettingsSelectModal.tsx
import React from "react";
import { Modal, Pressable, ScrollView, Text } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

export function AppSettingsSelectModal<T extends string>(props: {
    visible: boolean;
    title: string;
    options: { label: string; value: T }[];
    value: T;
    onSelect: (v: T) => void;
    onClose: () => void;
}) {
    const { colors } = useTheme();

    return (
        <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose}>
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
                        gap: 12,
                        maxHeight: "80%",
                    }}
                >
                    <Text style={{ fontWeight: "800", color: colors.text, fontSize: 16 }}>{props.title}</Text>

                    <ScrollView contentContainerStyle={{ gap: 10 }} showsVerticalScrollIndicator={false}>
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
                                    <Text style={{ fontWeight: "800", color: colors.text }}>{o.label}</Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>

                    <Pressable
                        onPress={props.onClose}
                        style={({ pressed }) => ({
                            paddingVertical: 12,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: pressed ? colors.background : colors.surface,
                            alignItems: "center",
                            opacity: pressed ? 0.92 : 1,
                        })}
                    >
                        <Text style={{ fontWeight: "800", color: colors.text }}>Cerrar</Text>
                    </Pressable>
                </Pressable>
            </Pressable>
        </Modal>
    );
}