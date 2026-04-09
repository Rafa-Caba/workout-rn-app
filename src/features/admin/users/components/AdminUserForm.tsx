// src/features/admin/users/components/AdminUserForm.tsx
import React from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { fetchAdminTrainers } from "@/src/services/admin/adminUsers.service";
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
    return <Text style={{ color: colors.mutedText, fontWeight: "800", fontSize: 12 }}>{text}</Text>;
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
            <Text style={{ fontWeight: "800", color: props.active ? colors.primaryText : colors.text }}>
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
                <Text style={{ fontWeight: "800", color: colors.text, fontSize: 16 }}>{props.title}</Text>
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
            <Text style={{ fontWeight: "800", color: props.primary ? colors.primaryText : colors.text }}>
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

    // =========================
    // Trainers dropdown (Admin)
    // =========================
    const [trainerModalOpen, setTrainerModalOpen] = React.useState(false);
    const [trainers, setTrainers] = React.useState<AdminUser[]>([]);
    const [trainersLoading, setTrainersLoading] = React.useState(false);
    const [trainersError, setTrainersError] = React.useState<string | null>(null);
    const [trainerSearch, setTrainerSearch] = React.useState("");

    const canPickTrainer = props.values.coachMode === "TRAINEE";

    const selectedTrainer = React.useMemo(() => {
        const id = props.values.assignedTrainer.trim();
        if (!id) return null;
        return trainers.find((t) => t.id === id) ?? null;
    }, [props.values.assignedTrainer, trainers]);

    const filteredTrainers = React.useMemo(() => {
        const q = trainerSearch.trim().toLowerCase();
        if (!q) return trainers;

        return trainers.filter((t) => {
            const name = (t.name ?? "").toLowerCase();
            const email = (t.email ?? "").toLowerCase();
            return name.includes(q) || email.includes(q);
        });
    }, [trainerSearch, trainers]);

    const loadTrainers = React.useCallback(async () => {
        setTrainersLoading(true);
        setTrainersError(null);

        try {
            const res = await fetchAdminTrainers({ page: 1, limit: 200 });
            const items = Array.isArray(res.items) ? res.items : [];
            setTrainers(items);
        } catch (e: any) {
            const msg =
                e?.response?.data?.error?.message ??
                e?.response?.data?.message ??
                e?.message ??
                "No se pudieron cargar trainers.";
            setTrainersError(String(msg));
        } finally {
            setTrainersLoading(false);
        }
    }, []);

    React.useEffect(() => {
        // Load trainers once for dropdown usage.
        void loadTrainers();
    }, [loadTrainers]);

    // If switching away from TRAINEE, clear assignedTrainer to keep data valid.
    React.useEffect(() => {
        if (props.values.coachMode !== "TRAINEE" && props.values.assignedTrainer) {
            set({ assignedTrainer: "" });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.values.coachMode]);

    const openTrainerPicker = () => {
        if (!canPickTrainer) return;
        setTrainerSearch("");
        setTrainerModalOpen(true);
    };

    const closeTrainerPicker = () => {
        setTrainerModalOpen(false);
    };

    const pickTrainer = (trainerId: string) => {
        set({ assignedTrainer: trainerId });
        setTrainerModalOpen(false);
    };

    return (
        <>
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
                        <Text style={{ fontWeight: "800", color: colors.text }}>Error</Text>
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
                        <Label text="Trainer asignado" />

                        <Pressable
                            onPress={openTrainerPicker}
                            disabled={!canPickTrainer || props.busy}
                            style={({ pressed }) => ({
                                borderWidth: 1,
                                borderColor: colors.border,
                                borderRadius: 12,
                                paddingHorizontal: 12,
                                paddingVertical: 12,
                                backgroundColor: colors.background,
                                opacity: !canPickTrainer || props.busy ? 0.55 : pressed ? 0.92 : 1,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 10,
                            })}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: colors.text, fontWeight: "800" }} numberOfLines={1}>
                                    {canPickTrainer
                                        ? selectedTrainer
                                            ? selectedTrainer.name
                                            : "Selecciona un trainer"
                                        : "—"}
                                </Text>

                                {canPickTrainer && selectedTrainer?.email ? (
                                    <Text style={{ color: colors.mutedText, fontSize: 12, fontWeight: "700" }} numberOfLines={1}>
                                        {selectedTrainer.email}
                                    </Text>
                                ) : null}
                            </View>

                            <Text style={{ color: colors.mutedText, fontWeight: "800" }}>▾</Text>
                        </Pressable>

                        {canPickTrainer ? (
                            <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                                Se listan usuarios con coaching = TRAINER (admin).
                            </Text>
                        ) : (
                            <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                                Solo aplica cuando el modo es TRAINEE.
                            </Text>
                        )}
                    </View>
                </SectionCard>

                <View style={{ flexDirection: "row", gap: 10 }}>
                    <ActionButton label="Cancelar" onPress={props.onCancel} disabled={props.busy} />
                    <ActionButton label={props.submitLabel} onPress={props.onSubmit} disabled={props.busy} primary />
                </View>
            </ScrollView>

            {/* Trainer Picker Modal */}
            <Modal visible={trainerModalOpen} animationType="slide" transparent onRequestClose={closeTrainerPicker}>
                <View style={[styles.modalBackdrop]}>
                    <View style={[styles.modalCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontWeight: "800", color: colors.text, fontSize: 16 }}>Selecciona un trainer</Text>
                                <Text style={{ color: colors.mutedText, fontWeight: "700", fontSize: 12 }}>
                                    {trainersLoading ? "Cargando…" : `${trainers.length} trainer(s)`}
                                </Text>
                            </View>

                            <Pressable
                                onPress={closeTrainerPicker}
                                style={({ pressed }) => ({
                                    paddingHorizontal: 12,
                                    paddingVertical: 10,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    backgroundColor: colors.background,
                                    opacity: pressed ? 0.92 : 1,
                                })}
                            >
                                <Text style={{ fontWeight: "800", color: colors.text }}>Cerrar</Text>
                            </Pressable>
                        </View>

                        <View style={{ height: 10 }} />

                        <TextInput
                            value={trainerSearch}
                            onChangeText={setTrainerSearch}
                            placeholder="Buscar por nombre o correo…"
                            placeholderTextColor={colors.mutedText}
                            autoCapitalize="none"
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

                        <View style={{ height: 10 }} />

                        {trainersError ? (
                            <View style={{ gap: 10 }}>
                                <Text style={{ color: colors.mutedText, fontWeight: "800" }}>{trainersError}</Text>
                                <Pressable
                                    onPress={() => void loadTrainers()}
                                    style={({ pressed }) => ({
                                        paddingHorizontal: 12,
                                        paddingVertical: 12,
                                        borderRadius: 12,
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                        backgroundColor: colors.background,
                                        opacity: pressed ? 0.92 : 1,
                                        alignItems: "center",
                                    })}
                                >
                                    <Text style={{ fontWeight: "800", color: colors.text }}>Reintentar</Text>
                                </Pressable>
                            </View>
                        ) : trainersLoading ? (
                            <View style={{ paddingVertical: 18, alignItems: "center", gap: 10 }}>
                                <ActivityIndicator />
                                <Text style={{ color: colors.mutedText, fontWeight: "800" }}>Cargando trainers…</Text>
                            </View>
                        ) : filteredTrainers.length === 0 ? (
                            <View style={{ paddingVertical: 18, alignItems: "center", gap: 10 }}>
                                <Text style={{ color: colors.mutedText, fontWeight: "800" }}>Sin resultados.</Text>
                            </View>
                        ) : (
                            <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
                                <View style={{ gap: 8 }}>
                                    {filteredTrainers.map((t) => {
                                        const active = t.id === props.values.assignedTrainer;
                                        return (
                                            <Pressable
                                                key={t.id}
                                                onPress={() => pickTrainer(t.id)}
                                                style={({ pressed }) => ({
                                                    borderWidth: 1,
                                                    borderColor: active ? colors.primary : colors.border,
                                                    backgroundColor: active ? colors.primary : colors.background,
                                                    borderRadius: 14,
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 12,
                                                    opacity: pressed ? 0.92 : 1,
                                                })}
                                            >
                                                <Text style={{ fontWeight: "800", color: active ? colors.primaryText : colors.text }} numberOfLines={1}>
                                                    {t.name || "Usuario"}
                                                </Text>
                                                {t.email ? (
                                                    <Text
                                                        style={{ color: active ? colors.primaryText : colors.mutedText, fontWeight: "700", fontSize: 12 }}
                                                        numberOfLines={1}
                                                    >
                                                        {t.email}
                                                    </Text>
                                                ) : null}
                                            </Pressable>
                                        );
                                    })}
                                </View>

                                <View style={{ height: 12 }} />

                                {props.values.assignedTrainer ? (
                                    <Pressable
                                        onPress={() => {
                                            set({ assignedTrainer: "" });
                                            closeTrainerPicker();
                                        }}
                                        style={({ pressed }) => ({
                                            paddingHorizontal: 12,
                                            paddingVertical: 12,
                                            borderRadius: 12,
                                            borderWidth: 1,
                                            borderColor: colors.border,
                                            backgroundColor: colors.background,
                                            opacity: pressed ? 0.92 : 1,
                                            alignItems: "center",
                                        })}
                                    >
                                        <Text style={{ fontWeight: "800", color: colors.text }}>Limpiar selección</Text>
                                    </Pressable>
                                ) : null}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.35)",
        padding: 16,
        justifyContent: "center",
    },
    modalCard: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
    },
});