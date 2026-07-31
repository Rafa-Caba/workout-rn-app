// /src/features/movements/components/movementSorting.ts
// Pure helpers for ordering the movement catalog and deriving section labels.

import type { Movement } from "@/src/types/movements.types";

export type MovementSortMode = "name" | "muscleGroup" | "equipment";

export type MovementSortOption = {
    value: MovementSortMode;
    label: string;
    description: string;
};

export const MOVEMENT_SORT_OPTIONS: readonly MovementSortOption[] = [
    {
        value: "name",
        label: "Nombre (A–Z)",
        description: "Orden alfabético por nombre.",
    },
    {
        value: "muscleGroup",
        label: "Grupo muscular",
        description: "Usa el primer músculo del movimiento.",
    },
    {
        value: "equipment",
        label: "Equipo",
        description: "Usa el primer equipo del movimiento.",
    },
];

const EMPTY_GROUP_KEY = "__empty__";

function normalizeText(value: string | null | undefined): string {
    return String(value ?? "").trim().replace(/\s+/g, " ");
}

function compareText(left: string, right: string): number {
    return left.localeCompare(right, "es", {
        sensitivity: "base",
        numeric: true,
    });
}

/**
 * Returns the first meaningful catalog value used for grouping.
 * Missing muscle/equipment values intentionally sort after populated groups.
 */
export function getMovementPrimaryGroupValue(
    movement: Movement,
    mode: Exclude<MovementSortMode, "name">,
): string | null {
    const source = mode === "muscleGroup" ? movement.muscleGroup : movement.equipment;
    const first = source.find((value) => normalizeText(value).length > 0);
    const normalized = normalizeText(first);

    return normalized.length > 0 ? normalized : null;
}

/**
 * Stable catalog ordering. Name is always the secondary sort so items inside
 * a muscle/equipment section remain predictable.
 */
export function sortMovements(items: Movement[], mode: MovementSortMode): Movement[] {
    return items
        .map((movement, originalIndex) => ({ movement, originalIndex }))
        .sort((leftEntry, rightEntry) => {
            const left = leftEntry.movement;
            const right = rightEntry.movement;

            if (mode !== "name") {
                const leftGroup = getMovementPrimaryGroupValue(left, mode);
                const rightGroup = getMovementPrimaryGroupValue(right, mode);

                if (leftGroup === null && rightGroup !== null) {
                    return 1;
                }

                if (leftGroup !== null && rightGroup === null) {
                    return -1;
                }

                if (leftGroup !== null && rightGroup !== null) {
                    const groupComparison = compareText(leftGroup, rightGroup);
                    if (groupComparison !== 0) {
                        return groupComparison;
                    }
                }
            }

            const nameComparison = compareText(normalizeText(left.name), normalizeText(right.name));
            if (nameComparison !== 0) {
                return nameComparison;
            }

            return leftEntry.originalIndex - rightEntry.originalIndex;
        })
        .map(({ movement }) => movement);
}

/**
 * Produces a normalized key so consecutive items can render one subtle header.
 */
export function getMovementGroupKey(
    movement: Movement,
    mode: Exclude<MovementSortMode, "name">,
): string {
    return getMovementPrimaryGroupValue(movement, mode)?.toLocaleLowerCase("es") ?? EMPTY_GROUP_KEY;
}

/**
 * Keeps stored custom values readable without changing their persisted value.
 */
export function formatMovementGroupLabel(
    movement: Movement,
    mode: Exclude<MovementSortMode, "name">,
): string {
    const value = getMovementPrimaryGroupValue(movement, mode);

    if (!value) {
        return mode === "muscleGroup" ? "Sin grupo muscular" : "Sin equipo";
    }

    const readableValue = value
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    return readableValue.charAt(0).toLocaleUpperCase("es") + readableValue.slice(1);
}

export function getMovementSortLabel(mode: MovementSortMode): string {
    return MOVEMENT_SORT_OPTIONS.find((option) => option.value === mode)?.label ?? "Nombre (A–Z)";
}
