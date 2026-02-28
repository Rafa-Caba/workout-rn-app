// /src/store/user.store.ts
import { create } from "zustand";

import { deleteMyProfilePic, getMe, patchMe, uploadMyProfilePic } from "@/src/services/user.service";
import { useAuthStore } from "@/src/store/auth.store";
import type { AuthUser } from "@/src/types/auth.types";
import type { UserProfileUpdateRequest } from "@/src/types/user.types";

export type ProfilePicAsset = {
    uri: string; // file:// or content:// or https://
    name?: string; // e.g. "profile.jpg"
    type?: string; // e.g. "image/jpeg"
};

type UserStoreState = {
    me: AuthUser | null;
    loading: boolean;
    error: string | null;

    // read actions
    fetchMe: () => Promise<AuthUser | null>;
    clearMe: () => void;

    // write actions
    updateMe: (payload: UserProfileUpdateRequest) => Promise<AuthUser>;
    uploadProfilePic: (file: ProfilePicAsset) => Promise<AuthUser>;
    deleteProfilePic: () => Promise<AuthUser>;
};

function setAuthUser(user: AuthUser | null) {
    // Keep any auth-dependent UI in sync
    useAuthStore.getState().setUser(user);
}

function getAccessToken(): string | null {
    return useAuthStore.getState().accessToken ?? null;
}

function normalizeErrorMessage(e: unknown, fallback: string): string {
    // axios errors may have response.data.error.message, but we avoid tight coupling here
    if (typeof e === "object" && e !== null) {
        const anyE = e as any;
        const msg =
            (typeof anyE?.response?.data?.error?.message === "string" && anyE.response.data.error.message) ||
            (typeof anyE?.message === "string" && anyE.message);
        if (msg && msg.trim().length > 0) return msg;
    }
    return fallback;
}

export const useUserStore = create<UserStoreState>((set) => ({
    me: null,
    loading: false,
    error: null,

    fetchMe: async () => {
        const token = getAccessToken();
        if (!token) {
            set({ me: null, loading: false, error: null });
            setAuthUser(null);
            return null;
        }

        set({ loading: true, error: null });

        try {
            const me = await getMe();
            set({ me, loading: false, error: null });
            setAuthUser(me);
            return me;
        } catch (e: unknown) {
            const msg = normalizeErrorMessage(e, "Failed to load profile");
            set({ loading: false, error: msg });
            return null;
        }
    },

    clearMe: () => {
        set({ me: null, loading: false, error: null });
        setAuthUser(null);
    },

    updateMe: async (payload: UserProfileUpdateRequest) => {
        const token = getAccessToken();
        if (!token) throw new Error("Not authenticated");

        set({ loading: true, error: null });

        try {
            const updated = await patchMe(payload);
            set({ me: updated, loading: false, error: null });
            setAuthUser(updated);
            return updated;
        } catch (e: unknown) {
            const msg = normalizeErrorMessage(e, "Failed to update profile");
            set({ loading: false, error: msg });
            throw new Error(msg);
        }
    },

    uploadProfilePic: async (file: ProfilePicAsset) => {
        const token = getAccessToken();
        if (!token) throw new Error("Not authenticated");

        if (!file?.uri || typeof file.uri !== "string" || file.uri.trim().length === 0) {
            throw new Error("Invalid file uri");
        }

        set({ loading: true, error: null });

        try {
            const updated = await uploadMyProfilePic(file);
            set({ me: updated, loading: false, error: null });
            setAuthUser(updated);
            return updated;
        } catch (e: unknown) {
            const msg = normalizeErrorMessage(e, "Failed to upload profile picture");
            set({ loading: false, error: msg });
            throw new Error(msg);
        }
    },

    deleteProfilePic: async () => {
        const token = getAccessToken();
        if (!token) throw new Error("Not authenticated");

        set({ loading: true, error: null });

        try {
            const updated = await deleteMyProfilePic();
            set({ me: updated, loading: false, error: null });
            setAuthUser(updated);
            return updated;
        } catch (e: unknown) {
            const msg = normalizeErrorMessage(e, "Failed to delete profile picture");
            set({ loading: false, error: msg });
            throw new Error(msg);
        }
    },
}));