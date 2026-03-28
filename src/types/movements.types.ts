// /src/types/movements.types.ts

export type MediaResourceType = "image" | "video";

export type MovementMedia = {
    publicId: string;
    url: string;
    resourceType: MediaResourceType;
    format: string | null;
    createdAt: string; // ISO
    originalName: string | null;
    meta: Record<string, unknown> | null;
};

export type Movement = {
    id: string;

    name: string;
    muscleGroup: string[];
    equipment: string[];

    isActive: boolean;

    media: MovementMedia | null;

    createdAt?: string;
    updatedAt?: string;
};

export type MovementsListQuery = {
    activeOnly?: boolean;
    q?: string;
};

export type CreateMovementBody = {
    name: string;
    muscleGroup: string[];
    equipment: string[];
    isActive?: boolean;
};

export type UpdateMovementBody = {
    name?: string;
    muscleGroup?: string[];
    equipment?: string[];
    isActive?: boolean;
};

export type MovementListResponse = {
    movements: Movement[];
};

export type MovementDeletedResponse = {
    deleted: true;
    movement: Movement;
};