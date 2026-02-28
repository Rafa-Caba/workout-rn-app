
/**
 * Admin user domain types (FE)
 * - Mirrors BE PublicUser/UserJSON fields that Admin endpoints return.
 * - Adds Coaching fields: coachMode, assignedTrainer
 * - Keeps FE-friendly query aliases (search/pageSize) while supporting BE params (q/limit).
 */

export type AdminUserRole = "admin" | "user";

export type AdminUserSex = "male" | "female" | "other" | null;

export type AdminUserActivityGoal =
    | "fat_loss"
    | "hypertrophy"
    | "strength"
    | "maintenance"
    | "other"
    | null;

export type AdminUserUnits = {
    weight: "kg" | "lb";
    distance: "km" | "mi";
} | null;

/**
 * Coaching
 * Mirrors BE CoachMode
 */
export type AdminUserCoachMode = "NONE" | "TRAINER" | "TRAINEE";

export interface AdminUser {
    id: string;
    name: string;
    email: string;
    sex: AdminUserSex;
    role: AdminUserRole;
    isActive: boolean;

    profilePicUrl: string | null;

    heightCm: number | null;
    currentWeightKg: number | null;

    units: AdminUserUnits;

    birthDate: string | null; // YYYY-MM-DD
    activityGoal: AdminUserActivityGoal;
    timezone: string | null;

    /**
     * Coaching
     */
    coachMode: AdminUserCoachMode;
    assignedTrainer: string | null; // User id (ObjectId string)

    lastLoginAt: string | null;

    createdAt: string;
    updatedAt: string;
}

/**
 * BE list endpoint returns:
 * { page, limit, total, items }
 *
 * We keep pageSize as alias for legacy FE components.
 */
export interface AdminUserListResponse {
    items: AdminUser[];
    total: number;
    page: number;

    // prefer BE naming
    limit?: number;

    // legacy alias used in FE UI
    pageSize?: number;
}

export type AdminUserRoleFilter = AdminUserRole | "all";
export type AdminUserActiveFilter = "all" | "active" | "inactive";
export type AdminUserCoachModeFilter = AdminUserCoachMode | "all";

/**
 * Query params:
 * - Supports both BE and FE naming to avoid breaking existing callers.
 * - Services/stores should prefer: page + limit + q
 */
export interface AdminUserQuery {
    // BE-preferred
    page?: number;
    limit?: number;
    q?: string;

    role?: AdminUserRole;
    coachMode?: AdminUserCoachMode;
    isActive?: boolean;

    // FE legacy aliases (optional)
    pageSize?: number;
    search?: string;
}

/**
 * Create payload (admin)
 * Mirrors BE adminCreateUserSchema
 */
export interface AdminUserCreatePayload {
    name: string;
    email: string;
    password: string;

    role?: AdminUserRole;
    sex?: AdminUserSex;
    isActive?: boolean;

    profilePicUrl?: string | null;

    heightCm?: number | null;
    currentWeightKg?: number | null;

    units?: AdminUserUnits;

    birthDate?: string | null;
    activityGoal?: AdminUserActivityGoal;
    timezone?: string | null;

    /**
     * Coaching
     * Cross-field rules enforced by BE:
     * - TRAINEE requires assignedTrainer
     * - otherwise assignedTrainer must be null
     */
    coachMode?: AdminUserCoachMode;
    assignedTrainer?: string | null;
}

/**
 * Update payload (admin)
 * Mirrors BE adminUpdateUserSchema
 *
 * NOTE:
 * - Password reset is handled by dedicated endpoint in BE (/password),
 *   but we keep this optional here only if your UI already sends it.
 * - If your BE does NOT accept password in PATCH /:id, do NOT send it from UI.
 */
export interface AdminUserUpdatePayload {
    name?: string;
    email?: string;

    // legacy field: only send if your BE supports it (otherwise use /password endpoint)
    password?: string;

    role?: AdminUserRole;
    sex?: AdminUserSex;
    isActive?: boolean;

    profilePicUrl?: string | null;

    heightCm?: number | null;
    currentWeightKg?: number | null;

    units?: AdminUserUnits;

    birthDate?: string | null;
    activityGoal?: AdminUserActivityGoal;
    timezone?: string | null;

    /**
     * Coaching updates
     */
    coachMode?: AdminUserCoachMode;
    assignedTrainer?: string | null;
}