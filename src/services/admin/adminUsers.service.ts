// /src/services/admin/adminUsers.service.ts
import { api } from "@/src/services/http.client";
import type {
    AdminUser,
    AdminUserCreatePayload,
    AdminUserListResponse,
    AdminUserQuery,
    AdminUserUpdatePayload,
} from "@/src/types/adminUser.types";

function normalizeAdminUsersQuery(query: AdminUserQuery): Record<string, unknown> {
    const params: Record<string, unknown> = {};

    // page
    if (typeof query.page === "number") {
        params.page = query.page;
    }

    // limit (BE) with pageSize (legacy) fallback
    if (typeof query.limit === "number") {
        params.limit = query.limit;
    } else if (typeof query.pageSize === "number") {
        params.limit = query.pageSize;
    }

    // q (BE) with search (legacy) fallback
    const q = typeof query.q === "string" ? query.q.trim() : "";
    const search = typeof query.search === "string" ? query.search.trim() : "";

    if (q) {
        params.q = q;
    } else if (search) {
        params.q = search;
    }

    // role
    if (query.role === "admin" || query.role === "user") {
        params.role = query.role;
    }

    // isActive
    if (typeof query.isActive === "boolean") {
        params.isActive = query.isActive;
    }

    // coachMode
    if (query.coachMode === "NONE" || query.coachMode === "TRAINER" || query.coachMode === "TRAINEE") {
        params.coachMode = query.coachMode;
    }

    return params;
}

function normalizeAdminUsersResponse(data: AdminUserListResponse): AdminUserListResponse {
    const anyData = data as any;

    const limit = typeof anyData.limit === "number" ? anyData.limit : undefined;
    const pageSize = typeof anyData.pageSize === "number" ? anyData.pageSize : undefined;

    // If BE returns `limit` only, provide `pageSize` for legacy UI.
    // If UI already uses `limit`, keep it too.
    if (limit !== undefined && pageSize === undefined) {
        return { ...data, pageSize: limit, limit };
    }

    // If legacy server returns `pageSize`, also expose `limit`.
    if (pageSize !== undefined && limit === undefined) {
        return { ...data, limit: pageSize, pageSize };
    }

    return data;
}

export async function fetchAdminUsers(query: AdminUserQuery = {}): Promise<AdminUserListResponse> {
    const params = normalizeAdminUsersQuery(query);

    const res = await api.get<AdminUserListResponse>("/admin/users", { params });
    return normalizeAdminUsersResponse(res.data);
}

/**
 * Convenience wrappers for coaching filters.
 * These stay in adminUser service because the endpoints are admin-only.
 */
export async function fetchAdminTrainers(query: Omit<AdminUserQuery, "coachMode"> = {}): Promise<AdminUserListResponse> {
    return fetchAdminUsers({
        ...query,
        coachMode: "TRAINER",
    } as AdminUserQuery);
}

export async function fetchAdminTrainees(query: Omit<AdminUserQuery, "coachMode"> = {}): Promise<AdminUserListResponse> {
    return fetchAdminUsers({
        ...query,
        coachMode: "TRAINEE",
    } as AdminUserQuery);
}

export async function fetchAdminUserById(id: string): Promise<AdminUser> {
    const res = await api.get<AdminUser>(`/admin/users/${id}`);
    return res.data;
}

export async function createAdminUser(payload: AdminUserCreatePayload): Promise<AdminUser> {
    const res = await api.post<AdminUser>("/admin/users", payload);
    return res.data;
}

export async function updateAdminUser(id: string, payload: AdminUserUpdatePayload): Promise<AdminUser> {
    const res = await api.patch<AdminUser>(`/admin/users/${id}`, payload);
    return res.data;
}

// Soft delete (deactivate)
export async function deleteAdminUser(id: string): Promise<{ id: string; message: string }> {
    const { data } = await api.delete(`/admin/users/${id}`);
    return data as { id: string; message: string };
}

export type AdminUserPurgeResponse = {
    id: string;
    message: string;
    cleanup?: {
        items: { model: string; deletedCount: number }[];
        totalDeleted: number;
    };
};

// Hard delete + cleanup report
export async function purgeAdminUser(id: string): Promise<AdminUserPurgeResponse> {
    const { data } = await api.delete(`/admin/users/${id}/purge`);
    return data as AdminUserPurgeResponse;
}