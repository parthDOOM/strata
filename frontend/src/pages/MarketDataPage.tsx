
/**
 * Market Data Analysis Page.
 * 
 * Displays historical candle chart and live price updates for a selected ticker.
 */

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

import CandleChart from "@/components/charts/CandleChart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getTickers } from "@/services/market";
import { useWebSocket } from "@/hooks/useWebSocket";
import { TickerSearch } from "@/components/TickerSearch";

export default function MarketDataPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialTicker = searchParams.get("ticker") || "SPY";
    const [selectedTicker, setSelectedTicker] = useState(initialTicker);

    // Update URL when ticker changes
    useEffect(() => {
        setSearchParams({ ticker: selectedTicker });
    }, [selectedTicker, setSearchParams]);

    // Fetch available tickers for search
    const { data: tickersData } = useQuery({
        queryKey: ["tickers"],
        queryFn: getTickers,
    });

    // Live Price WebSocket
    const { data: liveData } = useWebSocket(`ws://127.0.0.1:8000/api/v1/stream/ws/live/${selectedTicker}`);

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        Market Analysis
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Technical analysis and live market data
                    </p>
                </div>

                {/* Search Bar */}
                <TickerSearch
                    tickers={tickersData?.tickers.map(t => ({
                        symbol: t.symbol,
                        name: t.name || ""
                    })) || []}
                    onSelect={(ticker) => setSelectedTicker(ticker)}
                    placeholder="Search ticker (e.g. AAPL)..."
                />
            </div>

            {/* Main Content */}
            <Card className="flex-1 flex flex-col overflow-hidden">
                <CardHeader className="flex-shrink-0 pb-2 border-b">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                {selectedTicker}
                                {liveData && (
                                    <span className={`text-sm font-mono px-2 py-1 rounded ${liveData.price > (liveData.price * 0.99) ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                                        }`}>
                                        ${liveData.price.toFixed(2)}
                                    </span>
                                )}
                            </CardTitle>
                            <CardDescription>
                                {tickersData?.tickers.find(t => t.symbol === selectedTicker)?.name || selectedTicker}
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            {/* Timeframe selectors could go here */}
                            <Button variant="outline" size="sm" className="h-8">Daily</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 p-0 min-h-0 relative">
                    <div className="absolute inset-0">
                        <CandleChart key={selectedTicker} ticker={selectedTicker} livePrice={liveData} />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
