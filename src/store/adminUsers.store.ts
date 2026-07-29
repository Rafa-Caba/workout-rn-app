// /src/store/adminUsers.store.ts
import { create } from "zustand";

import type {
    AdminUser,
    AdminUserActiveFilter,
    AdminUserCreatePayload,
    AdminUserListResponse,
    AdminUserQuery,
    AdminUserRoleFilter,
    AdminUserUpdatePayload,
} from "@/src/types/adminUser.types";

import { queryClient } from "@/src/query/queryClient";
import { queryKeys } from "@/src/query/queryKeys";
import {
    createAdminUser,
    deleteAdminUser,
    fetchAdminUsers,
    purgeAdminUser,
    updateAdminUser,
} from "@/src/services/admin/adminUsers.service";

type CoachModeFilter = "all" | "NONE" | "TRAINER" | "TRAINEE";

export type AdminUserPurgeResponse = {
    id: string;
    message: string;
    cleanup?: {
        items: { model: string; deletedCount: number }[];
        totalDeleted: number;
    };
};

type AdminUsersState = {
    items: AdminUser[];
    total: number;

    page: number;
    pageSize: number;

    search: string;
    roleFilter: AdminUserRoleFilter;
    activeFilter: AdminUserActiveFilter;
    coachModeFilter: CoachModeFilter;

    loading: boolean;
    error: string | null;

    // actions
    setSearch: (value: string) => void;
    setRoleFilter: (value: AdminUserRoleFilter) => void;
    setActiveFilter: (value: AdminUserActiveFilter) => void;
    setCoachModeFilter: (value: CoachModeFilter) => void;

    setPage: (page: number) => void;

    loadUsers: () => Promise<void>;

    createUser: (payload: AdminUserCreatePayload) => Promise<AdminUser | null>;
    updateUser: (id: string, payload: AdminUserUpdatePayload) => Promise<AdminUser | null>;

    // Soft delete (deactivate)
    removeUser: (id: string) => Promise<boolean>;

    // Hard delete + cleanup report
    purgeUser: (id: string) => Promise<AdminUserPurgeResponse>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readMessage(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getErrorMessage(error: unknown, fallback: string): string {
    if (!isRecord(error)) return fallback;

    const directMessage = readMessage(error.message);
    const response = isRecord(error.response) ? error.response : null;
    const data = response && isRecord(response.data) ? response.data : null;
    const apiError = data && isRecord(data.error) ? data.error : null;

    return (
        readMessage(apiError?.message) ??
        readMessage(data?.message) ??
        directMessage ??
        fallback
    );
}

function maybeInvalidateTrainerTrainees(user?: AdminUser | null) {
    // If the new/updated user affects trainer ↔ trainee relationships,
    // invalidate trainer trainees list so TrainerDashboard refreshes.
    // - New TRAINEE assigned to a trainer -> appears in /trainer/trainees
    // - Changing assignedTrainer / coachMode affects that list
    // - New TRAINER might be relevant for admin assignment flows too (optional)
    const coachMode = user?.coachMode ?? null;

    if (coachMode === "TRAINEE" || coachMode === "TRAINER") {
        queryClient.invalidateQueries({ queryKey: queryKeys.trainer.trainees });
        queryClient.refetchQueries({ queryKey: queryKeys.trainer.trainees });
    }
}

export const useAdminUsersStore = create<AdminUsersState>((set, get) => ({
    items: [],
    total: 0,

    page: 1,
    pageSize: 10,

    search: "",
    roleFilter: "all",
    activeFilter: "all",
    coachModeFilter: "all",

    loading: false,
    error: null,

    setSearch(value) {
        set({ search: value, page: 1 });
    },

    setRoleFilter(value) {
        set({ roleFilter: value, page: 1 });
    },

    setActiveFilter(value) {
        set({ activeFilter: value, page: 1 });
    },

    setCoachModeFilter(value) {
        set({ coachModeFilter: value, page: 1 });
    },

    setPage(page) {
        set({ page });
    },

    async loadUsers() {
        const { page, pageSize, search, roleFilter, activeFilter, coachModeFilter } = get();

        set({ loading: true, error: null });

        try {
            const query: AdminUserQuery = {
                page,
                limit: pageSize,
            };

            const s = search.trim();
            if (s) query.q = s;

            if (roleFilter !== "all") query.role = roleFilter;

            if (activeFilter !== "all") {
                query.isActive = activeFilter === "active";
            }

            if (coachModeFilter !== "all") {
                query.coachMode = coachModeFilter;
            }

            const data: AdminUserListResponse = await fetchAdminUsers(query);

            const nextPageSize = data.pageSize ?? data.limit ?? pageSize;

            set({
                items: data.items,
                total: data.total,
                page: data.page,
                pageSize: nextPageSize,
                loading: false,
                error: null,
            });
        } catch (e: unknown) {
            const msg = getErrorMessage(e, "No se pudieron cargar los usuarios.");
            set({ loading: false, error: msg });
        }
    },

    async createUser(payload) {
        try {
            const user = await createAdminUser(payload);

            // Refresh admin list
            await get().loadUsers();

            // ✅ Invalidate trainer trainees if this affects the trainer dashboard
            maybeInvalidateTrainerTrainees(user);

            return user;
        } catch (e: unknown) {
            const msg = getErrorMessage(e, "No se pudo crear el usuario.");
            set({ error: msg });
            return null;
        }
    },

    async updateUser(id, payload) {
        try {
            const user = await updateAdminUser(id, payload);

            set((state) => ({
                items: state.items.map((u) => (u.id === id ? user : u)),
            }));

            // ✅ If admin changed coachMode/assignedTrainer, trainer dashboard can change.
            // We don't try to diff fields (payload types may vary); just invalidate when relevant fields exist.
            const touchedCoachMode = payload.coachMode !== undefined;
            const touchedAssignedTrainer = payload.assignedTrainer !== undefined;

            if (touchedCoachMode || touchedAssignedTrainer) {
                queryClient.invalidateQueries({ queryKey: queryKeys.trainer.trainees });
            } else {
                // Still safe: if the returned user is TRAINEE/TRAINER, it can matter
                maybeInvalidateTrainerTrainees(user);
            }

            return user;
        } catch (e: unknown) {
            const msg = getErrorMessage(e, "No se pudo actualizar el usuario.");
            set({ error: msg });
            return null;
        }
    },

    async removeUser(id) {
        try {
            await deleteAdminUser(id);

            set((state) => ({
                items: state.items.filter((u) => u.id !== id),
                total: Math.max(0, state.total - 1),
            }));

            // ✅ A removed/disabled user can affect trainer trainees list
            queryClient.invalidateQueries({ queryKey: queryKeys.trainer.trainees });

            return true;
        } catch (e: unknown) {
            const msg = getErrorMessage(e, "No se pudo eliminar el usuario.");
            set({ error: msg });
            return false;
        }
    },

    async purgeUser(id) {
        try {
            const result = await purgeAdminUser(id);

            set((state) => ({
                items: state.items.filter((u) => u.id !== id),
                total: Math.max(0, state.total - 1),
            }));

            // ✅ Purge affects everything; refresh trainer trainees
            queryClient.invalidateQueries({ queryKey: queryKeys.trainer.trainees });

            return result;
        } catch (e: unknown) {
            const msg = getErrorMessage(e, "No se pudo purgar el usuario.");
            set({ error: msg });
            throw e;
        }
    },
}));