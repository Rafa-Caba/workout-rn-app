// /src/features/routines/components/RoutinesJsonEditor.tsx
// Advanced RN editor for pasting and saving routine JSON payloads.
// Actions are repeated above and below the editors for long weekly payloads.

import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";

type Props = {
    busy: boolean;
    isSaving: boolean;
    editor: string;
    metaEditor: string;
    onEditorChange: (value: string) => void;
    onMetaEditorChange: (value: string) => void;
    onApplyMeta: () => void;
    onSave: () => void;
};

type EditorButtonProps = {
    title: string;
    disabled: boolean;
    tone?: "primary" | "neutral";
    onPress: () => void;
};

function EditorButton({
    title,
    disabled,
    tone = "neutral",
    onPress,
}: EditorButtonProps) {
    const { colors } = useTheme();
    const primary = tone === "primary";

    return (
        <Pressable
            accessibilityRole="button"
            disabled={disabled}
            onPress={onPress}
            style={({ pressed }) => ({
                flex: 1,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 11,
                borderWidth: 1,
                borderColor: primary ? colors.primary : colors.border,
                backgroundColor: primary ? colors.primary : colors.surface,
                opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
                paddingHorizontal: 12,
            })}
        >
            <Text
                style={{
                    color: primary ? colors.primaryText : colors.text,
                    fontWeight: "900",
                    textAlign: "center",
                }}
            >
                {title}
            </Text>
        </Pressable>
    );
}

function EditorActions({
    busy,
    isSaving,
    onApplyMeta,
    onSave,
}: Pick<Props, "busy" | "isSaving" | "onApplyMeta" | "onSave">) {
    return (
        <View style={{ flexDirection: "row", gap: 8 }}>
            <EditorButton
                title="Aplicar meta"
                disabled={busy}
                onPress={onApplyMeta}
            />
            <EditorButton
                title={isSaving ? "Guardando..." : "Guardar JSON"}
                disabled={busy || isSaving}
                tone="primary"
                onPress={onSave}
            />
        </View>
    );
}

function JsonTextArea({
    label,
    value,
    minHeight,
    disabled,
    onChange,
}: {
    label: string;
    value: string;
    minHeight: number;
    disabled: boolean;
    onChange: (value: string) => void;
}) {
    const { colors } = useTheme();

    return (
        <View style={{ gap: 6 }}>
            <Text style={{ color: colors.text, fontWeight: "800" }}>{label}</Text>
            <TextInput
                value={value}
                onChangeText={onChange}
                editable={!disabled}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
                textAlignVertical="top"
                selectionColor={colors.primary}
                style={{
                    minHeight,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    fontFamily: "Menlo",
                    fontSize: 13,
                    lineHeight: 19,
                }}
            />
        </View>
    );
}

export function RoutinesJsonEditor({
    busy,
    isSaving,
    editor,
    metaEditor,
    onEditorChange,
    onMetaEditorChange,
    onApplyMeta,
    onSave,
}: Props) {
    const { colors } = useTheme();

    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                borderRadius: 14,
                padding: 12,
                gap: 12,
            }}
        >
            <View style={{ gap: 3 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: "900" }}>
                    JSON de rutina
                </Text>
                <Text style={{ color: colors.mutedText }}>
                    Pega una semana completa igual que en la web. Los ejercicios sin id reciben uno antes de guardarse.
                </Text>
            </View>

            <EditorActions
                busy={busy}
                isSaving={isSaving}
                onApplyMeta={onApplyMeta}
                onSave={onSave}
            />

            <JsonTextArea
                label="JSON del body"
                value={editor}
                minHeight={420}
                disabled={busy}
                onChange={onEditorChange}
            />

            <JsonTextArea
                label="JSON de meta"
                value={metaEditor}
                minHeight={220}
                disabled={busy}
                onChange={onMetaEditorChange}
            />

            <Text style={{ color: colors.mutedText, fontSize: 12, lineHeight: 18 }}>
                Usa “Aplicar meta” para copiar el bloque de meta al body antes de guardar. El payload principal sigue siendo la fuente que se envía al API.
            </Text>

            <EditorActions
                busy={busy}
                isSaving={isSaving}
                onApplyMeta={onApplyMeta}
                onSave={onSave}
            />
        </View>
    );
}
