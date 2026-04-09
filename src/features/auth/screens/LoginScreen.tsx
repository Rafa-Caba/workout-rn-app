// src/features/auth/screens/LoginScreen.tsx
import { useRouter } from "expo-router";
import React from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { useLogin } from "@/src/hooks/auth/useLogin";
import { useTheme } from "@/src/theme/ThemeProvider";
import { toastError } from "@/src/utils/toast";

type FormState = {
    email: string;
    password: string;
};

export default function LoginScreen() {
    const router = useRouter();
    const loginMutation = useLogin();
    const { colors } = useTheme();

    const [form, setForm] = React.useState<FormState>({
        email: "",
        password: "",
    });

    const canSubmit =
        form.email.trim().length >= 5 &&
        form.password.trim().length >= 1 &&
        !loginMutation.isPending;

    const onSubmit = async () => {
        if (!canSubmit) return;

        try {
            await loginMutation.mutateAsync({
                email: form.email.trim().toLowerCase(),
                password: form.password,
            });

            router.replace("/(app)/dashboard");
        } catch (e: any) {
            toastError("Error al iniciar sesión", typeof e?.message === "string" ? e.message : "Intenta de nuevo");
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: colors.background }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <ScrollView
                contentContainerStyle={{
                    flexGrow: 1,
                    padding: 16,
                    justifyContent: "center",
                    gap: 12,
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={{ gap: 12 }}>
                    <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>
                        Iniciar sesión
                    </Text>

                    <Text style={{ color: colors.mutedText }}>
                        Accede con tu correo y contraseña.
                    </Text>

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
                                placeholder="Tu contraseña"
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
                            <Text style={{ color: colors.primaryText, fontWeight: "800" }}>
                                {loginMutation.isPending ? "Entrando..." : "Entrar"}
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={() => router.push("/(auth)/register")}
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
                            <Text style={{ color: colors.text, fontWeight: "800" }}>Crear cuenta</Text>
                        </Pressable>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}