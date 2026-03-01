// src/features/admin/users/components/AdminUserForm.tsx
import React from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeProvider";
import type { AdminUser, AdminUserCoachMode, AdminUserRole, AdminUserSex } from "@/src/types/adminUser.types";

type FormMode = "create" | "edit";

export type AdminUserFormValues = {
    name: string;
    email: string;
    password: string; // create required, edit optional
    role: AdminUserRole;
    sex: AdminUserSex;
    isActive: boolean;

    coachMode: AdminUserCoachMode;
    assignedTrainer: string; // user id string; only for TRAINEE
};

function toStr(v: unknown): string {
    return String(v ?? "").trim();
}

function isValidEmail(email: string): boolean {
    const s = email.trim();
    return s.includes("@") && s.includes(".");
}

function Label({ text }: { text: string }) {
    const { colors } = useTheme();
    return <Text style={{ color: colors.mutedText, fontWeight: "900", fontSize: 12 }}>{text}</Text>;
}

function Input(props: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    autoCapitalize?: "none" | "sentences" | "words" | "characters";
    secureTextEntry?: boolean;
    keyboardType?: "default" | "email-address";
}) {
    const { colors } = useTheme();

    return (
        <TextInput
            value={props.value}
            onChangeText={props.onChange}
            placeholder={props.placeholder}
            placeholderTextColor={colors.mutedText}
            autoCapitalize={props.autoCapitalize ?? "none"}
            secureTextEntry={props.secureTextEntry}
            keyboardType={props.keyboardType ?? "default"}
            style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: colors.text,
                backgroundColor: colors.background,
                fontWeight: "700",
            }}
        />
    );
}

function PillOption<T extends string>(props: {
    label: string;
    value: T;
    active: boolean;
    onPress: (v: T) => void;
}) {
    const { colors } = useTheme();
    return (
        <Pressable
            onPress={() => props.onPress(props.value)}
            style={({ pressed }) => ({
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: props.active ? colors.primary : colors.border,
                backgroundColor: props.active ? colors.primary : colors.surface,
                opacity: pressed ? 0.92 : 1,
            })}
        >
            <Text style={{ fontWeight: "900", color: props.active ? colors.primaryText : colors.text }}>
                {props.label}
            </Text>
        </Pressable>
    );
}

function SectionCard(props: { title: string; subtitle?: string; children: React.ReactNode }) {
    const { colors } = useTheme();
    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 14,
                gap: 12,
            }}
        >
            <View style={{ gap: 2 }}>
                <Text style={{ fontWeight: "900", color: colors.text, fontSize: 16 }}>{props.title}</Text>
                {props.subtitle ? <Text style={{ color: colors.mutedText }}>{props.subtitle}</Text> : null}
            </View>
            {props.children}
        </View>
    );
}

function ActionButton(props: { label: string; onPress: () => void; disabled?: boolean; primary?: boolean }) {
    const { colors } = useTheme();
    return (
        <Pressable
            onPress={props.disabled ? undefined : props.onPress}
            style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: props.primary ? 0 : 1,
                borderColor: colors.border,
                backgroundColor: props.primary ? colors.primary : pressed ? colors.background : colors.surface,
                alignItems: "center",
                opacity: props.disabled ? 0.55 : pressed ? 0.92 : 1,
            })}
        >
            <Text style={{ fontWeight: "900", color: props.primary ? colors.primaryText : colors.text }}>
                {props.label}
            </Text>
        </Pressable>
    );
}

export function buildInitialValues(mode: FormMode, user?: AdminUser | null): AdminUserFormValues {
    if (!user) {
        return {
            name: "",
            email: "",
            password: "",
            role: "user",
            sex: null,
            isActive: true,
            coachMode: "NONE",
            assignedTrainer: "",
        };
    }

    return {
        name: toStr(user.name),
        email: toStr(user.email),
        password: "", // never prefill
        role: user.role,
        sex: user.sex,
        isActive: Boolean(user.isActive),
        coachMode: user.coachMode,
        assignedTrainer: toStr(user.assignedTrainer),
    };
}

export function validateUserForm(mode: FormMode, v: AdminUserFormValues): string | null {
    if (v.name.trim().length < 2) return "El nombre debe tener al menos 2 caracteres.";
    if (!isValidEmail(v.email)) return "El correo no parece válido.";

    if (mode === "create" && v.password.trim().length < 6) {
        return "La contraseña debe tener al menos 6 caracteres.";
    }

    if (v.coachMode === "TRAINEE" && v.assignedTrainer.trim().length === 0) {
        return "Si el usuario es TRAINEE, debes asignar un trainer.";
    }

    if (v.coachMode !== "TRAINEE" && v.assignedTrainer.trim().length > 0) {
        return "Solo TRAINEE puede tener trainer asignado. Borra el trainer o cambia el coaching.";
    }

    return null;
}

export function AdminUserForm(props: {
    mode: FormMode;
    values: AdminUserFormValues;
    onChange: (next: AdminUserFormValues) => void;

    busy?: boolean;
    errorText?: string | null;

    onCancel: () => void;
    onSubmit: () => void;

    submitLabel: string;
}) {
    const { colors } = useTheme();

    const set = (patch: Partial<AdminUserFormValues>) => {
        props.onChange({ ...props.values, ...patch });
    };

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: colors.background }}
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 28 }}
            keyboardShouldPersistTaps="handled"
        >
            {props.errorText ? (
                <View
                    style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                        borderRadius: 16,
                        padding: 12,
                        gap: 6,
                    }}
                >
                    <Text style={{ fontWeight: "900", color: colors.text }}>Error</Text>
                    <Text style={{ color: colors.mutedText }}>{props.errorText}</Text>
                </View>
            ) : null}

            <SectionCard title="Datos básicos" subtitle="Información principal del usuario.">
                <View style={{ gap: 6 }}>
                    <Label text="Nombre" />
                    <Input
                        value={props.values.name}
                        onChange={(x) => set({ name: x })}
                        placeholder="Ej. Juan Pérez"
                        autoCapitalize="words"
                    />
                </View>

                <View style={{ gap: 6 }}>
                    <Label text="Correo" />
                    <Input
                        value={props.values.email}
                        onChange={(x) => set({ email: x })}
                        placeholder="correo@dominio.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>

                <View style={{ gap: 6 }}>
                    <Label text={props.mode === "create" ? "Contraseña" : "Contraseña (opcional)"} />
                    <Input
                        value={props.values.password}
                        onChange={(x) => set({ password: x })}
                        placeholder={props.mode === "create" ? "Mínimo 6 caracteres" : "Dejar vacío para no cambiar"}
                        secureTextEntry
                        autoCapitalize="none"
                    />
                </View>
            </SectionCard>

            <SectionCard title="Rol y estado" subtitle="Permisos y activación del usuario.">
                <View style={{ gap: 6 }}>
                    <Label text="Rol" />
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        <PillOption
                            label="Usuario"
                            value="user"
                            active={props.values.role === "user"}
                            onPress={(v) => set({ role: v })}
                        />
                        <PillOption
                            label="Admin"
                            value="admin"
                            active={props.values.role === "admin"}
                            onPress={(v) => set({ role: v })}
                        />
                    </View>
                </View>

                <View style={{ gap: 6 }}>
                    <Label text="Estado" />
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        <PillOption
                            label="Activo"
                            value="active"
                            active={props.values.isActive === true}
                            onPress={() => set({ isActive: true })}
                        />
                        <PillOption
                            label="Inactivo"
                            value="inactive"
                            active={props.values.isActive === false}
                            onPress={() => set({ isActive: false })}
                        />
                    </View>
                </View>
            </SectionCard>

            <SectionCard title="Coaching" subtitle="Control de trainer/trainee.">
                <View style={{ gap: 6 }}>
                    <Label text="Modo" />
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        <PillOption
                            label="Regular"
                            value="NONE"
                            active={props.values.coachMode === "NONE"}
                            onPress={(v) => set({ coachMode: v, assignedTrainer: "" })}
                        />
                        <PillOption
                            label="Trainer"
                            value="TRAINER"
                            active={props.values.coachMode === "TRAINER"}
                            onPress={(v) => set({ coachMode: v, assignedTrainer: "" })}
                        />
                        <PillOption
                            label="Trainee"
                            value="TRAINEE"
                            active={props.values.coachMode === "TRAINEE"}
                            onPress={(v) => set({ coachMode: v })}
                        />
                    </View>
                </View>

                <View style={{ gap: 6 }}>
                    <Label text="Trainer asignado (id)" />
                    <Input
                        value={props.values.assignedTrainer}
                        onChange={(x) => set({ assignedTrainer: x })}
                        placeholder={props.values.coachMode === "TRAINEE" ? "Id del trainer (requerido)" : "—"}
                        autoCapitalize="none"
                    />
                    <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                        Nota: por ahora es texto (id). Luego lo cambiamos por selector visual de trainers.
                    </Text>
                </View>
            </SectionCard>

            <View style={{ flexDirection: "row", gap: 10 }}>
                <ActionButton label="Cancelar" onPress={props.onCancel} disabled={props.busy} />
                <ActionButton label={props.submitLabel} onPress={props.onSubmit} disabled={props.busy} primary />
            </View>
        </ScrollView>
    );
}