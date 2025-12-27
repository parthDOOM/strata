/**
 * Options Analysis API Service.
 */
import { api } from "@/lib/api";

export interface IVSurfaceResponse {
    ticker: string;
    x: number[];
    y: number[];
    z: number[];
    delta?: number[];
    gamma?: number[];
    vega?: number[];
    theta?: number[];
    rho?: number[];
    count: number;
}

/**
 * Fetch IV Surface data for a ticker.
 */
export async function getIVSurface(ticker: string): Promise<IVSurfaceResponse> {
    const response = await api.get<IVSurfaceResponse>(`/options/iv/${ticker}`);
    return response.data;
}
