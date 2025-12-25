/**
 * Market Data API service.
 *
 * Provides functions for managing tickers and syncing market data.
 */

import { api } from "@/lib/api";

// ==============================================================================
// Types
// ==============================================================================

export interface Ticker {
    symbol: string;
    name?: string;
    sector?: string;
    is_active: boolean;
}

export interface TickerCreate {
    symbol: string;
    name?: string;
    sector?: string;
}

export interface TickerListResponse {
    tickers: Ticker[];
    count: number;
}

export interface SyncResponse {
    status: string;
    rows_added: number;
}

// ==============================================================================
// API Functions
// ==============================================================================

/**
 * Get all available tickers.
 */
export async function getTickers(): Promise<TickerListResponse> {
    const response = await api.get<TickerListResponse>("/market/tickers");
    return response.data;
}

/**
 * Add a new ticker to the database.
 */
export async function addTicker(data: TickerCreate): Promise<Ticker> {
    const response = await api.post<Ticker>("/market/tickers", data);
    return response.data;
}

/**
 * Sync market data for a specific ticker.
 */
export async function syncTicker(symbol: string): Promise<SyncResponse> {
    const response = await api.post<SyncResponse>(`/market/sync/${symbol}`);
    return response.data;
}
