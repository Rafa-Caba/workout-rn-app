// /src/services/auth.service.ts

import { LoginRequest, LoginResponse, RefreshResponse, RegisterRequest, RegisterResponse } from "../types/auth.types";
import { getApiBaseUrl, getApiRoot } from "./apiConfig";
import { api } from "./http.client";

export async function login(payload: LoginRequest): Promise<LoginResponse> {
    console.log("[API CONFIG]", {
        EXPO_PUBLIC_API_URL: (process as any)?.env?.EXPO_PUBLIC_API_URL,
        __DEV__,
        base: getApiBaseUrl(),
        root: getApiRoot(),
    });
    const res = await api.post("/auth/login", payload);

    return res.data as LoginResponse;
}

export async function register(payload: RegisterRequest): Promise<RegisterResponse> {
    const res = await api.post("/auth/register", payload);
    return res.data as RegisterResponse;
}

// BE: POST /auth/refresh -> { tokens: { accessToken, refreshToken } }
export async function refresh(refreshToken: string): Promise<RefreshResponse> {
    const res = await api.post("/auth/refresh", { refreshToken });
    return res.data as RefreshResponse;
}

// BE: POST /auth/logout -> { ok: true }
export async function logout(refreshToken: string): Promise<{ ok: true }> {
    const res = await api.post("/auth/logout", { refreshToken });
    return res.data as { ok: true };
}