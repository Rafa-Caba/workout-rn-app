// /src/hooks/useMovements.ts
import type { ApiAxiosError } from "@/src/services/http.client";
import {
    createMovement,
    deleteMovement,
    getMovementById,
    listMovements,
    updateMovement,
} from "@/src/services/workout/movements.service";
import type { Movement, MovementsListQuery } from "@/src/types/movements.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// -------------------- Query Keys --------------------

function movementsKey(query?: MovementsListQuery) {
    const q = (query?.q ?? "").trim() || null;
    const activeOnly = query?.activeOnly === true ? true : null;
    return ["movements", { q, activeOnly }] as const;
}

function movementKey(id: string) {
    return ["movement", id] as const;
}

// -------------------- Queries --------------------

export function useMovements(query?: MovementsListQuery) {
    return useQuery<Movement[], ApiAxiosError>({
        queryKey: movementsKey(query),
        queryFn: () => listMovements(query),
        staleTime: 30_000,
    });
}

export function useMovementById(id: string | null | undefined) {
    return useQuery<Movement, ApiAxiosError>({
        queryKey: movementKey(String(id ?? "")),
        queryFn: () => getMovementById(String(id)),
        enabled: Boolean(id),
        staleTime: 30_000,
    });
}

// -------------------- Mutations --------------------

// Mutation payload is FormData
export function useCreateMovement(queryToRefresh?: MovementsListQuery) {
    const qc = useQueryClient();

    return useMutation<Movement, ApiAxiosError, FormData>({
        mutationFn: (formData) => createMovement(formData),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: movementsKey(queryToRefresh) });
            qc.invalidateQueries({ queryKey: ["movements"] }); // broad safety net
        },
    });
}

// Update receives { id, formData }
export function useUpdateMovement(queryToRefresh?: MovementsListQuery) {
    const qc = useQueryClient();

    return useMutation<Movement, ApiAxiosError, { id: string; formData: FormData }>({
        mutationFn: ({ id, formData }) => updateMovement(id, formData),
        onSuccess: (updated) => {
            qc.setQueryData(movementKey(updated.id), updated);
            qc.invalidateQueries({ queryKey: movementsKey(queryToRefresh) });
            qc.invalidateQueries({ queryKey: ["movements"] });
        },
    });
}

export function useDeleteMovement(queryToRefresh?: MovementsListQuery) {
    const qc = useQueryClient();

    return useMutation<{ deleted: true; movement: Movement }, ApiAxiosError, { id: string }>({
        mutationFn: ({ id }) => deleteMovement(id),
        onSuccess: (_data, vars) => {
            qc.removeQueries({ queryKey: movementKey(vars.id) });
            qc.invalidateQueries({ queryKey: movementsKey(queryToRefresh) });
            qc.invalidateQueries({ queryKey: ["movements"] });
        },
    });
}