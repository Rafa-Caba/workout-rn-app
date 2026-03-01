// src/features/admin/users/screens/AdminUserNew.tsx
import { useRouter } from "expo-router";
import React from "react";
import { Alert } from "react-native";

import { useAdminUsersStore } from "@/src/store/adminUsers.store";
import type { AdminUserCreatePayload } from "@/src/types/adminUser.types";
import { AdminUserForm, buildInitialValues, validateUserForm, type AdminUserFormValues } from "../components/AdminUserForm";

export default function AdminUserNew() {
    const router = useRouter();

    const createUser = useAdminUsersStore((s) => s.createUser);
    const storeError = useAdminUsersStore((s) => s.error);
    const loading = useAdminUsersStore((s) => s.loading);

    const [values, setValues] = React.useState<AdminUserFormValues>(() => buildInitialValues("create"));

    const onCancel = () => router.back();

    const onSubmit = async () => {
        const err = validateUserForm("create", values);
        if (err) {
            Alert.alert("Validación", err);
            return;
        }

        const payload: AdminUserCreatePayload = {
            name: values.name.trim(),
            email: values.email.trim().toLowerCase(),
            password: values.password,

            role: values.role,
            sex: values.sex,
            isActive: values.isActive,

            coachMode: values.coachMode,
            assignedTrainer: values.coachMode === "TRAINEE" ? values.assignedTrainer.trim() : null,
        };

        const created = await createUser(payload);
        if (!created) {
            Alert.alert("Error", "No se pudo crear el usuario.");
            return;
        }

        Alert.alert("Listo", "Usuario creado ✅");
        router.back();
    };

    return (
        <AdminUserForm
            mode="create"
            values={values}
            onChange={setValues}
            busy={loading}
            errorText={storeError}
            onCancel={onCancel}
            onSubmit={onSubmit}
            submitLabel="Crear"
        />
    );
}