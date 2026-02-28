import { useMutation } from "@tanstack/react-query";

import { register as registerApi } from "@/src/services/auth.service";
import type { ApiAxiosError } from "@/src/services/http.client";
import { useAuthStore } from "@/src/store/auth.store";
import type { RegisterRequest, RegisterResponse } from "@/src/types/auth.types";

export function useRegister() {
    const setAuth = useAuthStore((s) => s.setAuth);

    return useMutation<RegisterResponse, ApiAxiosError, RegisterRequest>({
        mutationFn: (payload) => registerApi(payload),
        onSuccess: (data) => {
            setAuth({
                user: data.user,
                accessToken: data.tokens.accessToken,
                refreshToken: data.tokens.refreshToken,
            });
        },
    });
}