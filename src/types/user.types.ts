import type { AuthUser, CoachMode, Sex, TrainingLevel, Units, UserRole } from "@/src/types/auth.types";

/**
 * =========================================================
 * User domain types (FE)
 * - We reuse AuthUser as the canonical user shape
 * - This file adds update payloads for /users/me (and admin if needed)
 * =========================================================
 */

export type User = AuthUser;

export type ActivityGoal =
    | "fat_loss"
    | "hypertrophy"
    | "strength"
    | "maintenance"
    | "other"
    | null;

/**
 * PATCH /users/me payload
 * Keep it optional fields only (partial updates).
 */
export type UserProfileUpdateRequest = Partial<{
    name: string;
    sex: Sex;

    profilePicUrl: string | null;

    heightCm: number | null;
    currentWeightKg: number | null;

    units: Units | null;

    birthDate: string | null; // YYYY-MM-DD
    activityGoal: ActivityGoal;
    timezone: string | null;

    /**
     * Baseline training profile (user-owned)
     */
    trainingLevel: TrainingLevel;
    healthNotes: string | null;

    /**
     * Coaching (may be controlled by dedicated endpoints later)
     */
    coachMode: CoachMode;
    assignedTrainer: string | null; // User id
}>;

/**
 * Optional: admin update payload (matches BE shape)
 */
export type AdminUserUpdateRequest = UserProfileUpdateRequest &
    Partial<{
        email: string;
        role: UserRole;
    }>;

export type UserUnitsUpdate = {
    units: Units | null;
};