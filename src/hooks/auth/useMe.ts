import { useAuthStore } from "@/src/store/auth.store";
import { useUserStore } from "@/src/store/user.store";
import type { AuthUser } from "@/src/types/auth.types";
import * as React from "react";

type UseMeState = {
    me: AuthUser | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<AuthUser | null>;
};

export function useMe(autoLoad: boolean = true): UseMeState {
    const accessToken = useAuthStore((s) => s.accessToken);
    const authUser = useAuthStore((s) => s.user);

    const me = useUserStore((s) => s.me);
    const loading = useUserStore((s) => s.loading);
    const error = useUserStore((s) => s.error);
    const fetchMe = useUserStore((s) => s.fetchMe);

    // hydrate userStore from authStore for instant UI
    React.useEffect(() => {
        if (!me && authUser) {
            // set local store state without forcing a fetch
            useUserStore.setState({ me: authUser });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authUser]);

    React.useEffect(() => {
        if (!autoLoad) return;
        if (!accessToken) return;
        void fetchMe();
    }, [autoLoad, accessToken, fetchMe]);

    return {
        me: me ?? authUser ?? null,
        loading,
        error,
        refetch: fetchMe,
    };
}