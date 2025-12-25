/**
 * StatArb API service.
 *
 * Client for accessing pairs trading analysis and results.
 */

import { api } from "@/lib/api";

// ==============================================================================
// Types
// ==============================================================================

export interface CointegratedPair {
    id: number;
    ticker_1: string;
    ticker_2: string;
    p_value: number;
    hedge_ratio: number;
    half_life: number;
    last_z_score: number;
    is_active: boolean;
}

export interface AnalysisRequest {
    universe: string[];
}

export interface AnalysisResponse {
    message: string;
    status: string;
}

export interface SpreadPoint {
    date: string;
    z_score: number;
}

// ==============================================================================
// API Functions
// ==============================================================================

/**
 * Trigger pairs analysis.
 */
export async function analyzePairs(universe: string[]): Promise<AnalysisResponse> {
    const response = await api.post<AnalysisResponse>("/statarb/analyze", { universe });
    return response.data;
}

/**
 * Get active cointegrated pairs.
 */
export async function getPairs(): Promise<CointegratedPair[]> {
    const response = await api.get<CointegratedPair[]>("/statarb/pairs");
    return response.data;
}

/**
 * Get z-score spread history for visualization.
 */
export async function getSpread(ticker1: string, ticker2: string): Promise<SpreadPoint[]> {
    const response = await api.get<SpreadPoint[]>("/statarb/spread", {
        params: { ticker1, ticker2 }
    });
    return response.data;
}
