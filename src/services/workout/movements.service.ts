// /src/services/workout/movements.service.ts

import { api } from "@/src/services/http.client";
import type {
    Movement,
    MovementDeletedResponse,
    MovementListResponse,
    MovementsListQuery,
} from "@/src/types/movements.types";

/**
 * List movements (JSON).
 */
export async function listMovements(query?: MovementsListQuery): Promise<Movement[]> {
    const res = await api.get<MovementListResponse>("/movements", {
        params: query ?? {},
    });

    return res.data.movements;
}

/**
 * Get single movement (JSON).
 */
export async function getMovementById(id: string): Promise<Movement> {
    const res = await api.get<Movement>(`/movements/${encodeURIComponent(id)}`);
    return res.data;
}

/**
 * Create movement with multipart/form-data.
 * Caller should build FormData in the screen/section layer.
 *
 * IMPORTANT (RN):
 * Do not set Content-Type manually to avoid boundary issues.
 */
export async function createMovement(formData: FormData): Promise<Movement> {
    const res = await api.post<Movement>("/movements", formData);
    return res.data;
}

/**
 * Update movement with multipart/form-data.
 * Same transport rules as create.
 *
 * IMPORTANT (RN):
 * Do not set Content-Type manually to avoid boundary issues.
 */
export async function updateMovement(id: string, formData: FormData): Promise<Movement> {
    const res = await api.put<Movement>(`/movements/${encodeURIComponent(id)}`, formData);
    return res.data;
}

/**
 * Delete movement (JSON).
 */
export async function deleteMovement(id: string): Promise<MovementDeletedResponse> {
    const res = await api.delete<MovementDeletedResponse>(`/movements/${encodeURIComponent(id)}`);
    return res.data;
}