// src/store/auth.store.ts
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import * as authService from "@/src/services/auth.service";
import { getZustandStorage } from "@/src/store/storage";
import { useUserStore } from "@/src/store/user.store";
import type { AuthTokens, AuthUser, LoginRequest, RegisterRequest } from "@/src/types/auth.types";

type AuthStatus = "idle" | "booting" | "authenticated" | "unauthenticated";

type AuthState = {
    status: AuthStatus;

    user: AuthUser | null;
    accessToken: string | null;
    refreshToken: string | null;

    setAuth: (args: { user: AuthUser; accessToken: string; refreshToken: string }) => void;
    setTokens: (args: { accessToken: string; refreshToken: string }) => void;
    setUser: (user: AuthUser | null) => void;

    // async actions
    rehydrate: () => Promise<void>;
    login: (payload: LoginRequest) => Promise<void>;
    register: (payload: RegisterRequest) => Promise<void>;
    logout: () => Promise<void>;
    refreshNow: () => Promise<AuthTokens | null>;

    clear: () => void;
};

const STORAGE_KEY = "workout-auth";

type PersistHelpers = {
    persist?: {
        rehydrate: () => Promise<void>;
        clearStorage?: () => Promise<void>;
    };
};

function computeStatus(args: { user: AuthUser | null; accessToken: string | null; refreshToken: string | null }): AuthStatus {
    const { user, accessToken, refreshToken } = args;
    if (user && accessToken && refreshToken) return "authenticated";
    return "unauthenticated";
}

function syncUserStore(user: AuthUser | null) {
    try {
        useUserStore.setState({ me: user, loading: false, error: null });
    } catch {
        // ignore
    }
}

function clearUserDomainState() {
    try {
        useUserStore.getState().clearMe();
    } catch {
        // ignore
    }
}

async function safeClearPersistedAuth() {
    try {
        const storeWithPersist = useAuthStore as typeof useAuthStore & PersistHelpers;
        if (storeWithPersist.persist?.clearStorage) {
            await storeWithPersist.persist.clearStorage();
            return;
        }
    } catch {
        // ignore
    }

    try {
        await getZustandStorage().removeItem(STORAGE_KEY);
    } catch {
        // ignore
    }
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            status: "idle",

            user: null,
            accessToken: null,
            refreshToken: null,

            setAuth: ({ user, accessToken, refreshToken }) => {
                set({
                    user,
                    accessToken,
                    refreshToken,
                    status: "authenticated",
                });
                syncUserStore(user);
            },

            setTokens: ({ accessToken, refreshToken }) => {
                set({ accessToken, refreshToken });
            },

            setUser: (user) => {
                set({ user, status: user ? "authenticated" : "unauthenticated" });
                syncUserStore(user);
            },

            rehydrate: async () => {
                // Mark booting while we load persisted auth
                set({ status: "booting" });

                try {
                    const storeWithPersist = useAuthStore as typeof useAuthStore & PersistHelpers;
                    if (storeWithPersist.persist?.rehydrate) {
                        await storeWithPersist.persist.rehydrate();
                    }
                } catch {
                    // ignore; we still compute status below
                }

                const nextStatus = computeStatus({
                    user: get().user,
                    accessToken: get().accessToken,
                    refreshToken: get().refreshToken,
                });

                set({ status: nextStatus });

                // Keep user store in sync if we have a user
                if (get().user) {
                    syncUserStore(get().user);
                }
            },

            login: async (payload) => {
                const data = await authService.login(payload);

                set({
                    user: data.user,
                    accessToken: data.tokens.accessToken,
                    refreshToken: data.tokens.refreshToken,
                    status: "authenticated",
                });

                syncUserStore(data.user);
            },

            register: async (payload) => {
                const data = await authService.register(payload);

                set({
                    user: data.user,
                    accessToken: data.tokens.accessToken,
                    refreshToken: data.tokens.refreshToken,
                    status: "authenticated",
                });

                syncUserStore(data.user);
            },

            refreshNow: async () => {
                const rt = get().refreshToken;
                if (!rt) return null;

                try {
                    const out = await authService.refresh(rt);
                    const tokens = out.tokens;

                    set({
                        accessToken: tokens.accessToken,
                        refreshToken: tokens.refreshToken,
                    });

                    return tokens;
                } catch {
                    // If refresh fails, clear auth and force unauthenticated
                    get().clear();
                    return null;
                }
            },

            logout: async () => {
                const rt = get().refreshToken;

                // Always clear locally (idempotent UX)
                set({ user: null, accessToken: null, refreshToken: null, status: "unauthenticated" });
                clearUserDomainState();
                await safeClearPersistedAuth();

                // Best-effort server logout (idempotent on BE)
                if (rt) {
                    try {
                        await authService.logout(rt);
                    } catch {
                        // ignore
                    }
                }
            },

            clear: () => {
                set({ user: null, accessToken: null, refreshToken: null, status: "unauthenticated" });
                clearUserDomainState();
                void safeClearPersistedAuth();
            },
        }),
        {
            name: STORAGE_KEY,
            storage: createJSONStorage(() => getZustandStorage()),
            partialize: (s) => ({
                user: s.user,
                accessToken: s.accessToken,
                refreshToken: s.refreshToken,
            }),
        }
    )
);