
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
    muscleGroup: string | null;
    equipment: string | null;

    isActive: boolean;

    // MovementsPage catalog (illustrations/media)
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
    muscleGroup?: string | null;
    equipment?: string | null;
    isActive?: boolean;
};

export type UpdateMovementBody = {
    name?: string;
    muscleGroup?: string | null;
    equipment?: string | null;
    isActive?: boolean;
};
