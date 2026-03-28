// /src/hooks/useMovements.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ApiAxiosError } from "@/src/services/http.client";
import {
    createMovement,
    deleteMovement,
    getMovementById,
    listMovements,
    updateMovement,
} from "@/src/services/workout/movements.service";
import type {
    Movement,
    MovementDeletedResponse,
    MovementsListQuery,
} from "@/src/types/movements.types";

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

export function useCreateMovement(queryToRefresh?: MovementsListQuery) {
    const queryClient = useQueryClient();

    return useMutation<Movement, ApiAxiosError, FormData>({
        mutationFn: (formData) => createMovement(formData),
        onSuccess: (created) => {
            queryClient.setQueryData(movementKey(created.id), created);
            queryClient.invalidateQueries({ queryKey: movementsKey(queryToRefresh) });
            queryClient.invalidateQueries({ queryKey: ["movements"] });
        },
    });
}

export function useUpdateMovement(queryToRefresh?: MovementsListQuery) {
    const queryClient = useQueryClient();

    return useMutation<Movement, ApiAxiosError, { id: string; formData: FormData }>({
        mutationFn: ({ id, formData }) => updateMovement(id, formData),
        onSuccess: (updated) => {
            queryClient.setQueryData(movementKey(updated.id), updated);
            queryClient.invalidateQueries({ queryKey: movementsKey(queryToRefresh) });
            queryClient.invalidateQueries({ queryKey: ["movements"] });
        },
    });
}

export function useDeleteMovement(queryToRefresh?: MovementsListQuery) {
    const queryClient = useQueryClient();

    return useMutation<MovementDeletedResponse, ApiAxiosError, { id: string }>({
        mutationFn: ({ id }) => deleteMovement(id),
        onSuccess: (_data, variables) => {
            queryClient.removeQueries({ queryKey: movementKey(variables.id) });
            queryClient.invalidateQueries({ queryKey: movementsKey(queryToRefresh) });
            queryClient.invalidateQueries({ queryKey: ["movements"] });
        },
    });
}