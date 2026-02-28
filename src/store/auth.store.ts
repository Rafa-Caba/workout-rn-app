// /src/store/auth.store.ts
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import * as authService from "@/src/services/auth.service";
import { getZustandStorage } from "@/src/store/storage";
import { useUserStore } from "@/src/store/user.store";
import type { AuthTokens, AuthUser, LoginRequest, RegisterRequest } from "@/src/types/auth.types";

type AuthState = {
    user: AuthUser | null;
    accessToken: string | null;
    refreshToken: string | null;

    setAuth: (args: { user: AuthUser; accessToken: string; refreshToken: string }) => void;
    setTokens: (args: { accessToken: string; refreshToken: string }) => void;
    setUser: (user: AuthUser | null) => void;

    // async actions
    login: (payload: LoginRequest) => Promise<void>;
    register: (payload: RegisterRequest) => Promise<void>;
    logout: () => Promise<void>;
    refreshNow: () => Promise<AuthTokens | null>;

    clear: () => void;
};

const STORAGE_KEY = "workout-auth";

function clearUserDomainState() {
    try {
        useUserStore.getState().clearMe();
    } catch {
        // ignore
    }
}

async function safeClearPersistedAuth() {
    try {
        // Zustand persist adds this helper on the store
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyStore = useAuthStore as any;
        if (anyStore?.persist?.clearStorage) {
            await anyStore.persist.clearStorage();
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
            user: null,
            accessToken: null,
            refreshToken: null,

            setAuth: ({ user, accessToken, refreshToken }) => {
                set({ user, accessToken, refreshToken });
                try {
                    useUserStore.setState({ me: user });
                } catch {
                    // ignore
                }
            },

            setTokens: ({ accessToken, refreshToken }) => set({ accessToken, refreshToken }),

            setUser: (user) => {
                set({ user });
                try {
                    useUserStore.setState({ me: user });
                } catch {
                    // ignore
                }
            },

            login: async (payload) => {
                const data = await authService.login(payload);

                set({
                    user: data.user,
                    accessToken: data.tokens.accessToken,
                    refreshToken: data.tokens.refreshToken,
                });

                try {
                    useUserStore.setState({ me: data.user, loading: false, error: null });
                } catch {
                    // ignore
                }
            },

            register: async (payload) => {
                const data = await authService.register(payload);

                set({
                    user: data.user,
                    accessToken: data.tokens.accessToken,
                    refreshToken: data.tokens.refreshToken,
                });

                try {
                    useUserStore.setState({ me: data.user, loading: false, error: null });
                } catch {
                    // ignore
                }
            },

            refreshNow: async () => {
                const rt = get().refreshToken;
                if (!rt) return null;

                try {
                    const out = await authService.refresh(rt);
                    const tokens = out.tokens;

                    set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
                    return tokens;
                } catch {
                    get().clear();
                    return null;
                }
            },

            logout: async () => {
                const rt = get().refreshToken;

                // Always clear locally (idempotent UX)
                set({ user: null, accessToken: null, refreshToken: null });
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
                set({ user: null, accessToken: null, refreshToken: null });
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