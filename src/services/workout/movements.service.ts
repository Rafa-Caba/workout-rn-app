// /src/services/workout/movements.service.ts
import { api } from "@/src/services/http.client";
import type { Movement, MovementsListQuery } from "@/src/types/movements.types";

/**
 * List movements (JSON).
 */
export async function listMovements(query?: MovementsListQuery): Promise<Movement[]> {
    const res = await api.get(`/movements`, {
        params: query ?? {},
    });

    // BE returns: { movements }
    return (res.data?.movements ?? []) as Movement[];
}

/**
 * Get single movement (JSON).
 */
export async function getMovementById(id: string): Promise<Movement> {
    const res = await api.get(`/movements/${encodeURIComponent(id)}`);
    return res.data as Movement;
}

/**
 * Create movement with multipart/form-data.
 * Caller should build FormData (RN/web compatible).
 *
 * IMPORTANT (RN): do NOT set Content-Type manually (boundary issues).
 */
export async function createMovement(formData: FormData): Promise<Movement> {
    const res = await api.post(`/movements`, formData);
    return res.data as Movement;
}

/**
 * Update movement with multipart/form-data.
 * Same as create, but PUT + id in path.
 *
 * IMPORTANT (RN): do NOT set Content-Type manually (boundary issues).
 */
export async function updateMovement(id: string, formData: FormData): Promise<Movement> {
    const res = await api.put(`/movements/${encodeURIComponent(id)}`, formData);
    return res.data as Movement;
}

/**
 * Delete movement (JSON).
 */
export async function deleteMovement(id: string): Promise<{ deleted: true; movement: Movement }> {
    const res = await api.delete(`/movements/${encodeURIComponent(id)}`);
    return res.data as { deleted: true; movement: Movement };
}