// /src/services/http.client.ts
import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from "axios";

import { useAuthStore } from "../store/auth.store";
import { ApiError } from "../types/api.types";
import { RefreshResponse } from "../types/auth.types";
import { API_TIMEOUT_MS, getApiRoot } from "./apiConfig";
import { rawApi } from "./http.raw";

export const api: AxiosInstance = axios.create({
    baseURL: getApiRoot(),
    timeout: API_TIMEOUT_MS,
});

export type ApiAxiosError = AxiosError<ApiError>;

function isAuthEndpoint(url?: string): boolean {
    if (!url) return false;
    return (
        url.includes("/auth/login") ||
        url.includes("/auth/register") ||
        url.includes("/auth/refresh") ||
        url.includes("/auth/logout")
    );
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
    const refreshToken = useAuthStore.getState().refreshToken ?? null;
    if (!refreshToken) return null;

    const { data } = await rawApi.post<RefreshResponse>("/auth/refresh", { refreshToken });

    useAuthStore.setState({
        accessToken: data.tokens.accessToken,
        refreshToken: data.tokens.refreshToken,
    });

    return data.tokens.accessToken;
}

api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().accessToken ?? null;

    if (token) {
        config.headers = config.headers ?? {};
        const headers = config.headers as any;

        if (!headers.Authorization && !headers.authorization) {
            headers.Authorization = `Bearer ${token}`;
        }
    }

    return config;
});

api.interceptors.response.use(
    (res) => res,
    async (error: ApiAxiosError) => {
        const status = error.response?.status ?? null;
        const originalConfig = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;

        if (!originalConfig) throw error;

        if (status === 401 && !originalConfig._retry && !isAuthEndpoint(originalConfig.url)) {
            originalConfig._retry = true;

            const refreshToken = useAuthStore.getState().refreshToken ?? null;
            if (!refreshToken) {
                useAuthStore.getState().clear();
                throw error;
            }

            try {
                if (!refreshPromise) {
                    refreshPromise = refreshAccessToken().finally(() => {
                        refreshPromise = null;
                    });
                }

                const newAccessToken = await refreshPromise;

                if (!newAccessToken) {
                    useAuthStore.getState().clear();
                    throw error;
                }

                originalConfig.headers = originalConfig.headers ?? {};
                (originalConfig.headers as any).Authorization = `Bearer ${newAccessToken}`;

                return api(originalConfig);
            } catch (refreshErr) {
                useAuthStore.getState().clear();
                throw refreshErr;
            }
        }

        throw error;
    }
);