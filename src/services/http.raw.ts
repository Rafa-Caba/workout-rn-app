// /src/services/http.raw.ts
import axios, { type AxiosInstance } from "axios";
import { API_TIMEOUT_MS, getApiRoot } from "./apiConfig";

export const rawApi: AxiosInstance = axios.create({
    baseURL: getApiRoot(),
    timeout: API_TIMEOUT_MS,
});