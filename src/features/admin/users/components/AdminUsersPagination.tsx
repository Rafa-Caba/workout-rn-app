// src/features/admin/users/components/AdminUsersPagination.tsx
import React from "react";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

function Btn(props: { label: string; onPress: () => void; disabled?: boolean }) {
    const { colors } = useTheme();
    return (
        <Pressable
            onPress={props.disabled ? undefined : props.onPress}
            style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: pressed ? colors.background : colors.surface,
                alignItems: "center",
                opacity: props.disabled ? 0.5 : pressed ? 0.92 : 1,
            })}
        >
            <Text style={{ fontWeight: "900", color: colors.text }}>{props.label}</Text>
        </Pressable>
    );
}

export function AdminUsersPagination(props: {
    page: number;
    totalPages: number;
    total: number;
    pageSize: number;
    onPrev: () => void;
    onNext: () => void;
}) {
    const { colors } = useTheme();

    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 14,
                gap: 10,
            }}
        >
            <Text style={{ fontWeight: "900", color: colors.text }}>Paginación</Text>

            <Text style={{ color: colors.mutedText }}>
                Página {props.page} de {props.totalPages} · Total: {props.total}
            </Text>

            <View style={{ flexDirection: "row", gap: 10 }}>
                <Btn label="Anterior" onPress={props.onPrev} disabled={props.page <= 1} />
                <Btn label="Siguiente" onPress={props.onNext} disabled={props.page >= props.totalPages} />
            </View>
        </View>
    );
}