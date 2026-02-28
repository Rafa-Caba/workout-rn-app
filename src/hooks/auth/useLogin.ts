import { useMutation } from "@tanstack/react-query";

import { login } from "@/src/services/auth.service";
import type { ApiAxiosError } from "@/src/services/http.client";
import { useAuthStore } from "@/src/store/auth.store";
import type { LoginRequest, LoginResponse } from "@/src/types/auth.types";

export function useLogin() {
    const setAuth = useAuthStore((s) => s.setAuth);

    return useMutation<LoginResponse, ApiAxiosError, LoginRequest>({
        mutationFn: (payload) => login(payload),
        onSuccess: (data) => {
            setAuth({
                user: data.user,
                accessToken: data.tokens.accessToken,
                refreshToken: data.tokens.refreshToken,
            });
        },
    });
}