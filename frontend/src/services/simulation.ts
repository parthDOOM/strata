/**
 * Simulation API service.
 *
 * Provides types and functions for Monte Carlo simulation requests.
 */

import { api } from "@/lib/api";

// ==============================================================================
// Request Types
// ==============================================================================

export interface SimulationRequest {
    /** Ticker symbol (e.g., "AAPL", "SPY") */
    ticker: string;
    /** Start date for historical data analysis (YYYY-MM-DD) */
    start_date: string;
    /** End date for historical data analysis (YYYY-MM-DD) */
    end_date: string;
    /** Number of simulation paths (100-100,000) */
    num_simulations: number;
    /** Number of time steps to project (trading days) */
    num_steps: number;
    /** Number of histogram bins */
    histogram_bins?: number;
    /** Random seed for reproducibility (optional) */
    seed?: number;
}

// ==============================================================================
// Response Types
// ==============================================================================

export interface SimulationParameters {
    s0: number;
    mu: number;
    sigma: number;
    num_simulations: number;
    num_steps: number;
    data_points_used: number;
    analysis_period: {
        start: string;
        end: string;
    };
}

export interface FinalPriceStats {
    mean: number;
    std: number;
    min: number;
    max: number;
}

export interface HistogramData {
    counts: number[];
    edges: number[];
}

export interface TailRiskMetrics {
    var_95: number;
    var_99: number;
    cvar_95: number;
    cvar_99: number;
}

export interface SimulationResults {
    mean_path: number[];
    percentile_05: number[];
    percentile_95: number[];
    histogram: HistogramData;
    final_price: FinalPriceStats;
    tail_risk: TailRiskMetrics;
}

export interface SimulationResponse {
    ticker: string;
    parameters: SimulationParameters;
    results: SimulationResults;
}

// ==============================================================================
// Chart Data Types
// ==============================================================================

export interface ChartDataPoint {
    day: number;
    mean: number;
    upper: number;
    lower: number;
}

/**
 * Transform simulation response into chart-friendly data.
 */
export function transformToChartData(response: SimulationResponse): ChartDataPoint[] {
    const { mean_path, percentile_05, percentile_95 } = response.results;

    return mean_path.map((mean, index) => ({
        day: index,
        mean: Number(mean.toFixed(2)),
        upper: Number(percentile_95[index].toFixed(2)),
        lower: Number(percentile_05[index].toFixed(2)),
    }));
}

// ==============================================================================
// API Functions
// ==============================================================================

/**
 * Run a Monte Carlo simulation.
 *
 * @param request Simulation parameters
 * @returns Simulation results with price paths and statistics
 * @throws Error if simulation fails
 */
export async function runSimulation(
    request: SimulationRequest
): Promise<SimulationResponse> {
    const response = await api.post<SimulationResponse>(
        "/simulation/monte-carlo",
        request
    );
    return response.data;
}

/**
 * Check simulation engine health.
 */
export async function checkEngineHealth(): Promise<{
    status: string;
    message?: string;
}> {
    const response = await api.get("/simulation/health");
    return response.data;
}
