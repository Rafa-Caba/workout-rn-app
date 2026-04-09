// src/features/admin/users/screens/AdminUserEdit.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";

import { useAdminUsersStore } from "@/src/store/adminUsers.store";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { AdminUser, AdminUserUpdatePayload } from "@/src/types/adminUser.types";

import { AdminUserForm, buildInitialValues, validateUserForm, type AdminUserFormValues } from "../components/AdminUserForm";

function getParamId(params: Record<string, string | string[] | undefined>): string | null {
    const raw = params["id"];
    if (typeof raw === "string" && raw.trim()) return raw.trim();
    return null;
}

export default function AdminUserEdit() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { colors } = useTheme();

    const id = getParamId(params);

    const items = useAdminUsersStore((s) => s.items);
    const loadUsers = useAdminUsersStore((s) => s.loadUsers);
    const updateUser = useAdminUsersStore((s) => s.updateUser);

    const loading = useAdminUsersStore((s) => s.loading);
    const storeError = useAdminUsersStore((s) => s.error);

    const [booting, setBooting] = React.useState(true);
    const [user, setUser] = React.useState<AdminUser | null>(null);
    const [values, setValues] = React.useState<AdminUserFormValues>(() => buildInitialValues("edit"));

    React.useEffect(() => {
        let mounted = true;

        async function run() {
            if (!id) {
                setBooting(false);
                return;
            }

            // If not present, load list once (best-effort)
            const existing = items.find((u) => u.id === id) ?? null;
            if (!existing) {
                await loadUsers();
            }

            const after = (mounted ? useAdminUsersStore.getState().items : []).find((u) => u.id === id) ?? null;

            if (!mounted) return;

            const found = existing ?? after;
            setUser(found);
            setValues(buildInitialValues("edit", found));
            setBooting(false);
        }

        void run();

        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const onCancel = () => router.back();

    const onSubmit = async () => {
        if (!id) return;

        const err = validateUserForm("edit", values);
        if (err) {
            Alert.alert("Validación", err);
            return;
        }

        const payload: AdminUserUpdatePayload = {
            name: values.name.trim(),
            email: values.email.trim().toLowerCase(),
            role: values.role,
            sex: values.sex,
            isActive: values.isActive,

            coachMode: values.coachMode,
            assignedTrainer: values.coachMode === "TRAINEE" ? values.assignedTrainer.trim() : null,
        };

        // password optional on edit: only send when present
        if (values.password.trim().length > 0) {
            payload.password = values.password;
        }

        const updated = await updateUser(id, payload);
        if (!updated) {
            Alert.alert("Error", "No se pudo actualizar el usuario.");
            return;
        }

        Alert.alert("Listo", "Usuario actualizado ✅");
        router.back();
    };

    if (!id) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, padding: 16, gap: 10 }}>
                <Text style={{ fontWeight: "800", color: colors.text, fontSize: 18 }}>Error</Text>
                <Text style={{ color: colors.mutedText }}>No se recibió el id del usuario.</Text>
            </View>
        );
    }

    if (booting) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, padding: 16, alignItems: "center", justifyContent: "center", gap: 10 }}>
                <ActivityIndicator />
                <Text style={{ color: colors.mutedText }}>Cargando usuario...</Text>
            </View>
        );
    }

    if (!user) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, padding: 16, gap: 10 }}>
                <Text style={{ fontWeight: "800", color: colors.text, fontSize: 18 }}>No encontrado</Text>
                <Text style={{ color: colors.mutedText }}>No se encontró el usuario con id: {id}</Text>
                {storeError ? <Text style={{ color: colors.mutedText }}>{storeError}</Text> : null}
            </View>
        );
    }

    return (
        <AdminUserForm
            mode="edit"
            values={values}
            onChange={setValues}
            busy={loading}
            errorText={storeError}
            onCancel={onCancel}
            onSubmit={onSubmit}
            submitLabel="Guardar"
        />
    );
}