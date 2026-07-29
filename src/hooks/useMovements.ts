// /src/hooks/useMovements.ts
// Movement catalog queries and mutations under canonical cache keys.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/src/query/queryKeys";
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

function normalizeMovementQuery(query?: MovementsListQuery) {
    return {
        q: query?.q?.trim() || undefined,
        activeOnly: query?.activeOnly === true ? true : undefined,
    };
}

export function useMovements(query?: MovementsListQuery) {
    return useQuery<Movement[], ApiAxiosError>({
        queryKey: queryKeys.movements.list(normalizeMovementQuery(query)),
        queryFn: () => listMovements(query),
        staleTime: 30_000,
    });
}

export function useMovementById(id: string | null | undefined) {
    const normalizedId = id ?? "";

    return useQuery<Movement, ApiAxiosError>({
        queryKey: queryKeys.movements.byId(normalizedId),
        queryFn: () => getMovementById(normalizedId),
        enabled: Boolean(id),
        staleTime: 30_000,
    });
}

export function useCreateMovement(queryToRefresh?: MovementsListQuery) {
    void queryToRefresh;
    const queryClient = useQueryClient();

    return useMutation<Movement, ApiAxiosError, FormData>({
        mutationFn: createMovement,
        onSuccess: async (created) => {
            queryClient.setQueryData(queryKeys.movements.byId(created.id), created);
            await queryClient.invalidateQueries({ queryKey: queryKeys.movements.root });
        },
    });
}

export function useUpdateMovement(queryToRefresh?: MovementsListQuery) {
    void queryToRefresh;
    const queryClient = useQueryClient();

    return useMutation<Movement, ApiAxiosError, { id: string; formData: FormData }>({
        mutationFn: ({ id, formData }) => updateMovement(id, formData),
        onSuccess: async (updated) => {
            queryClient.setQueryData(queryKeys.movements.byId(updated.id), updated);
            await queryClient.invalidateQueries({ queryKey: queryKeys.movements.root });
        },
    });
}

export function useDeleteMovement(queryToRefresh?: MovementsListQuery) {
    void queryToRefresh;
    const queryClient = useQueryClient();

    return useMutation<MovementDeletedResponse, ApiAxiosError, { id: string }>({
        mutationFn: ({ id }) => deleteMovement(id),
        onSuccess: async (_data, variables) => {
            queryClient.removeQueries({
                queryKey: queryKeys.movements.byId(variables.id),
            });
            await queryClient.invalidateQueries({ queryKey: queryKeys.movements.root });
        },
    });
}
