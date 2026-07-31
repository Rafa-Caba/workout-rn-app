// /src/features/routines/components/RoutinesModeToggle.tsx
// RN segmented control for switching between form and JSON routine editing.

import React from "react";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

export type RoutineEditorMode = "form" | "json";

type Props = {
    mode: RoutineEditorMode;
    busy: boolean;
    onModeChange: (mode: RoutineEditorMode) => void;
};

type ModeButtonProps = {
    label: string;
    value: RoutineEditorMode;
    mode: RoutineEditorMode;
    busy: boolean;
    onModeChange: (mode: RoutineEditorMode) => void;
};

function ModeButton({
    label,
    value,
    mode,
    busy,
    onModeChange,
}: ModeButtonProps) {
    const { colors } = useTheme();
    const active = mode === value;

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled: busy }}
            disabled={busy}
            onPress={() => onModeChange(value)}
            style={({ pressed }) => ({
                flex: 1,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 11,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? colors.primary : colors.surface,
                opacity: busy ? 0.5 : pressed ? 0.9 : 1,
            })}
        >
            <Text
                style={{
                    color: active ? colors.primaryText : colors.text,
                    fontWeight: "900",
                }}
            >
                {label}
            </Text>
        </Pressable>
    );
}

export function RoutinesModeToggle({ mode, busy, onModeChange }: Props) {
    return (
        <View style={{ flexDirection: "row", gap: 8 }}>
            <ModeButton
                label="Formulario"
                value="form"
                mode={mode}
                busy={busy}
                onModeChange={onModeChange}
            />
            <ModeButton
                label="JSON"
                value="json"
                mode={mode}
                busy={busy}
                onModeChange={onModeChange}
            />
        </View>
    );
}
