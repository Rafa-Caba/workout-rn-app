// /src/store/adminUsers.store.ts
import { create } from "zustand";

import type {
    AdminUser,
    AdminUserActiveFilter,
    AdminUserCreatePayload,
    AdminUserListResponse,
    AdminUserRoleFilter,
    AdminUserUpdatePayload,
} from "@/src/types/adminUser.types";

import { createAdminUser, deleteAdminUser, fetchAdminUsers, purgeAdminUser, updateAdminUser } from "@/src/services/admin/adminUsers.service";

type CoachModeFilter = "all" | "NONE" | "TRAINER" | "TRAINEE";

/**
 * Backend expects:
 * - page (number)
 * - limit (number)
 * - q (string)
 * - role ("admin" | "user")
 * - isActive (boolean)
 * - coachMode ("NONE" | "TRAINER" | "TRAINEE")
 */
type AdminUsersQuery = {
    page: number;
    limit: number;
    q?: string;
    role?: "admin" | "user";
    isActive?: boolean;
    coachMode?: "NONE" | "TRAINER" | "TRAINEE";
};

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

function getErrorMessage(e: unknown, fallback: string): string {
    if (typeof e === "object" && e !== null) {
        const anyErr = e as any;
        return anyErr?.response?.data?.error?.message ?? anyErr?.response?.data?.message ?? anyErr?.message ?? fallback;
    }
    return fallback;
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
            const query: AdminUsersQuery = {
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

            const data: AdminUserListResponse = await fetchAdminUsers(query as any);

            const nextPageSize = (data as any).pageSize ?? (data as any).limit ?? pageSize;

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
            await get().loadUsers();
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

            return result;
        } catch (e: unknown) {
            const msg = getErrorMessage(e, "No se pudo purgar el usuario.");
            set({ error: msg });
            throw e;
        }
    },
}));