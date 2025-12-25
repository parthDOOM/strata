/**
 * Axios API client configuration.
 *
 * Pre-configured axios instance for communicating with the FastAPI backend.
 */

import axios, { AxiosError, type AxiosResponse } from "axios";

/**
 * Base API client for the Quant Platform backend.
 *
 * Pre-configured with:
 * - Base URL pointing to the FastAPI server
 * - JSON content type headers
 * - Response interceptor for error handling
 */
export const api = axios.create({
    baseURL: "http://localhost:8000/api/v1",
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 30000, // 30 seconds for simulation requests
});

/**
 * Response interceptor for centralized error handling.
 */
api.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
        // Extract error message from response
        const message =
            (error.response?.data as { detail?: string })?.detail ||
            error.message ||
            "An unexpected error occurred";

        // Log errors in development
        if (import.meta.env.DEV) {
            console.error("[API Error]", {
                status: error.response?.status,
                url: error.config?.url,
                message,
            });
        }

        // Re-throw with enhanced error
        return Promise.reject(new Error(message));
    }
);

/**
 * Type-safe API response wrapper.
 */
export async function fetchApi<T>(url: string): Promise<T> {
    const response = await api.get<T>(url);
    return response.data;
}

/**
 * Type-safe POST request wrapper.
 */
export async function postApi<T, D = unknown>(url: string, data: D): Promise<T> {
    const response = await api.post<T>(url, data);
    return response.data;
}

export default api;
