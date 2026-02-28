// src/features/auth/screens/RegisterScreen.tsx
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { useRegister } from "@/src/hooks/auth/useRegister";
import { useTheme } from "@/src/theme/ThemeProvider";
import { toastError } from "@/src/utils/toast";

type FormState = {
    name: string;
    email: string;
    password: string;
};

export default function RegisterScreen() {
    const router = useRouter();
    const registerMutation = useRegister();
    const { colors } = useTheme();

    const [form, setForm] = React.useState<FormState>({
        name: "",
        email: "",
        password: "",
    });

    const canSubmit =
        form.name.trim().length >= 2 &&
        form.email.trim().length >= 5 &&
        form.password.trim().length >= 6 &&
        !registerMutation.isPending;

    const onSubmit = async () => {
        if (!canSubmit) return;

        try {
            await registerMutation.mutateAsync({
                name: form.name.trim(),
                email: form.email.trim().toLowerCase(),
                password: form.password,
            });

            router.replace("/(app)/dashboard");
        } catch (e: any) {
            toastError("Error al crear cuenta", typeof e?.message === "string" ? e.message : "Intenta de nuevo");
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background, padding: 16, justifyContent: "center", gap: 12 }}>
            <Text style={{ fontSize: 22, fontWeight: "900", color: colors.text }}>Crear cuenta</Text>
            <Text style={{ color: colors.mutedText }}>
                Regístrate para guardar tus rutinas y progreso.
            </Text>

            {/* Card */}
            <View
                style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    borderRadius: 14,
                    padding: 14,
                    gap: 12,
                }}
            >
                <View style={{ gap: 8 }}>
                    <Text style={{ color: colors.text, fontWeight: "800" }}>Nombre</Text>
                    <TextInput
                        value={form.name}
                        onChangeText={(v) => setForm((s) => ({ ...s, name: v }))}
                        placeholder="Tu nombre"
                        placeholderTextColor={colors.mutedText}
                        autoCapitalize="words"
                        style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            color: colors.text,
                            backgroundColor: colors.background,
                        }}
                    />
                </View>

                <View style={{ gap: 8 }}>
                    <Text style={{ color: colors.text, fontWeight: "800" }}>Email</Text>
                    <TextInput
                        value={form.email}
                        onChangeText={(v) => setForm((s) => ({ ...s, email: v }))}
                        placeholder="tu@email.com"
                        placeholderTextColor={colors.mutedText}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            color: colors.text,
                            backgroundColor: colors.background,
                        }}
                    />
                </View>

                <View style={{ gap: 8 }}>
                    <Text style={{ color: colors.text, fontWeight: "800" }}>Contraseña</Text>
                    <TextInput
                        value={form.password}
                        onChangeText={(v) => setForm((s) => ({ ...s, password: v }))}
                        placeholder="Mínimo 6 caracteres"
                        placeholderTextColor={colors.mutedText}
                        secureTextEntry
                        autoCapitalize="none"
                        style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            color: colors.text,
                            backgroundColor: colors.background,
                        }}
                    />
                </View>

                <Pressable
                    onPress={onSubmit}
                    disabled={!canSubmit}
                    style={{
                        paddingVertical: 12,
                        borderRadius: 12,
                        backgroundColor: colors.primary,
                        opacity: canSubmit ? 1 : 0.6,
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Text style={{ color: colors.primaryText, fontWeight: "900" }}>
                        {registerMutation.isPending ? "Creando..." : "Crear cuenta"}
                    </Text>
                </Pressable>

                <Pressable
                    onPress={() => router.replace("/(auth)/login")}
                    style={{
                        paddingVertical: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Text style={{ color: colors.text, fontWeight: "900" }}>
                        Ya tengo cuenta → Iniciar sesión
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}