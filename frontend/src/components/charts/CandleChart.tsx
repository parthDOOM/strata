

import { useState, useEffect, useRef } from "react";
import Plot from "react-plotly.js";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface PricePoint {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface PriceHistoryResponse {
    ticker: string;
    prices: PricePoint[];
}

async function getPriceHistory(symbol: string): Promise<PriceHistoryResponse> {
    const response = await api.get<PriceHistoryResponse>(`/market/prices/${symbol}?limit=5000`);
    return response.data;
}


interface CandleChartProps {
    ticker: string;
    livePrice?: {
        price: number;
        timestamp: string;
    } | null;
}

export default function CandleChart({ ticker, livePrice }: CandleChartProps) {
    // 1. Hooks (Must be unconditional)
    const { data, isLoading } = useQuery({
        queryKey: ["history", ticker],
        queryFn: () => getPriceHistory(ticker),
        enabled: !!ticker,
    });

    // State for layout to handle dynamic updates
    const [chartLayout, setChartLayout] = useState<Partial<Plotly.Layout>>({
        dragmode: 'pan',
        margin: { r: 50, t: 25, b: 40, l: 60 },
        showlegend: false,
        xaxis: {
            autorange: false,
            domain: [0, 1],
            rangebreaks: [{ bounds: ["sat", "mon"] }],
            title: { text: 'Date' },
            type: 'date',
            rangeslider: { visible: false },
            gridcolor: 'rgba(128,128,128,0.1)'
        },
        yaxis: {
            autorange: false, // Turn off auto to manually control
            domain: [0, 1],
            type: 'linear',
            gridcolor: 'rgba(128,128,128,0.1)'
        },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#94a3b8' },
        autosize: true,
        uirevision: 'true'
    });

    // Effect to initialize range once data loads
    const [isInitialized, setIsInitialized] = useState(false);

    // State to accumulate live intraday candles locally
    const [intradayCandles, setIntradayCandles] = useState<PricePoint[]>([]);

    // Reset intraday candles when ticker changes
    useEffect(() => {
        setIntradayCandles([]);
    }, [ticker]);

    // Ref to hold the latest live price to avoid re-renders on every tick
    const latestPriceRef = useRef<CandleChartProps['livePrice']>(null);

    // Update ref when prop changes
    useEffect(() => {
        latestPriceRef.current = livePrice;
    }, [livePrice]);

    // Throttled update effect
    useEffect(() => {
        const interval = setInterval(() => {
            const currentLive = latestPriceRef.current;
            if (!currentLive) return;

            setIntradayCandles(current => {
                const newCandles = [...current];
                const liveKey = currentLive.timestamp.substring(0, 16);

                if (newCandles.length > 0) {
                    const lastCandle = newCandles[newCandles.length - 1];
                    const lastKey = lastCandle.date.substring(0, 16);

                    if (lastKey === liveKey) {
                        // Only update if price changed to avoid unnecessary state updates
                        if (lastCandle.close !== currentLive.price ||
                            lastCandle.high !== Math.max(lastCandle.high, currentLive.price) ||
                            lastCandle.low !== Math.min(lastCandle.low, currentLive.price)) {

                            newCandles[newCandles.length - 1] = {
                                ...lastCandle,
                                close: currentLive.price,
                                high: Math.max(lastCandle.high, currentLive.price),
                                low: Math.min(lastCandle.low, currentLive.price),
                            };
                            return newCandles;
                        }
                        return current; // No change
                    }
                }

                // New minute or first point
                newCandles.push({
                    date: currentLive.timestamp,
                    open: currentLive.price,
                    high: currentLive.price,
                    low: currentLive.price,
                    close: currentLive.price,
                    volume: 0
                });
                return newCandles;
            });
        }, 500); // Update chart max every 500ms

        return () => clearInterval(interval);
    }, []); // Run once on mount

    // REMOVED old direct useEffect dependency on [livePrice]

    // 2. Early Returns (Conditional) - Moved AFTER all hooks
    if (isLoading) {
        return (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                Loading data for {ticker}...
            </div>
        );
    }

    if (!data || data.prices.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                No data available for {ticker}
            </div>
        );
    }

    // Merge live data
    // Combine History + Intraday
    // Filter intraday to ensure we don't duplicate keys present in history (simple check)
    let displayPrices = [...data.prices];

    // Add intraday candles
    // Basic logic: Just append them. Improved logic could check for date overlap.
    // For now, appending is safe if History = Daily and Intraday = Minute.
    // They will just show up as smaller bars at the end.
    if (intradayCandles.length > 0) {
        // Optional: Filter out intraday candles that are older than the last history candle? 
        // e.g. if history updated.
        const lastHistDate = displayPrices[displayPrices.length - 1].date;
        const validIntraday = intradayCandles.filter(c => c.date > lastHistDate);
        displayPrices = [...displayPrices, ...validIntraday];
    } else if (livePrice && intradayCandles.length === 0) {
        // Fallback: If no intraday state yet (first render with livePrice), show current point
        // This prevents a "blip" where the chart waits for the effect to run
        displayPrices.push({
            date: livePrice.timestamp,
            open: livePrice.price,
            high: livePrice.price,
            low: livePrice.price,
            close: livePrice.price,
            volume: 0
        });
    }

    // Prepare data arrays
    const dates = displayPrices.map(p => p.date);
    const opens = displayPrices.map(p => p.open);
    const highs = displayPrices.map(p => p.high);
    const lows = displayPrices.map(p => p.low);
    const closes = displayPrices.map(p => p.close);

    // Initial setup
    if (!isInitialized && displayPrices.length > 0) {
        const lastDate = displayPrices[displayPrices.length - 1].date;
        const lastDateObj = new Date(lastDate);
        const oneYearAgoObj = new Date(lastDateObj);
        oneYearAgoObj.setFullYear(oneYearAgoObj.getFullYear() - 1);
        const oneYearAgo = oneYearAgoObj.toISOString().split('T')[0];

        // Initial Y-range calculation for the 1-year window
        // Filter prices within range
        const visiblePrices = displayPrices.filter(p => p.date >= oneYearAgo && p.date <= lastDate);
        let minLow = Infinity;
        let maxHigh = -Infinity;
        for (const p of visiblePrices) {
            if (p.low < minLow) minLow = p.low;
            if (p.high > maxHigh) maxHigh = p.high;
        }
        // Add padding
        const padding = (maxHigh - minLow) * 0.05;

        setChartLayout((prev: any) => ({
            ...prev,
            xaxis: {
                ...prev.xaxis,
                range: [oneYearAgo, lastDate]
            },
            yaxis: {
                ...prev.yaxis,
                range: [minLow - padding, maxHigh + padding]
            }
        }));
        setIsInitialized(true);
    }

    // Handle Zoom/Pan to auto-scale Y axis
    const handleRelayout = (event: Readonly<Plotly.PlotRelayoutEvent>) => {
        // Check if X-axis range changed
        const e = event as any;
        let xStart: string | undefined;
        let xEnd: string | undefined;

        if (e['xaxis.range[0]'] && e['xaxis.range[1]']) {
            xStart = String(e['xaxis.range[0]']);
            xEnd = String(e['xaxis.range[1]']);
        } else if (e['xaxis.range'] && Array.isArray(e['xaxis.range'])) {
            xStart = String(e['xaxis.range'][0]);
            xEnd = String(e['xaxis.range'][1]);
        }

        if (xStart && xEnd) {
            // Find visible data
            // Use binary search or simple filter if performance allows. Filter is O(N). N=5000 is cheap.
            const startStr = xStart.split(' ')[0]; // Handle date string safety
            const endStr = xEnd.split(' ')[0];

            let minLow = Infinity;
            let maxHigh = -Infinity;
            let found = false;

            // Loop through displayPrices
            for (const p of displayPrices) {
                // Determine equality/range based on string or timestamp comparison
                // Plotly dates might be full ISO or 'YYYY-MM-DD ...'
                if (p.date >= startStr && p.date <= endStr) {
                    if (p.low < minLow) minLow = p.low;
                    if (p.high > maxHigh) maxHigh = p.high;
                    found = true;
                }
            }

            if (found && isFinite(minLow) && isFinite(maxHigh)) {
                const padding = (maxHigh - minLow) * 0.05;
                // We update layout state. 
                // IMPORTANT: In onRelayout, we shouldn't trigger a full re-render loop if possible.
                // But React state SET triggers render.

                // We only need to set Y range. Plotly handles X range internally during drag?
                // Actually, if we update state passed to 'layout', Plotly reacts.

                setChartLayout(prev => ({
                    ...prev,
                    xaxis: {
                        ...prev.xaxis,
                        range: [xStart!, xEnd!] // Sync state with event
                    },
                    yaxis: {
                        ...prev.yaxis,
                        range: [minLow - padding, maxHigh + padding]
                    }
                }));
            }
        }
    };

    // Helper: Calculate SMA
    const calculateSMA = (data: PricePoint[], period: number) => {
        const result = [];
        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
                result.push(null);
                continue;
            }
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += data[i - j].close;
            }
            result.push(sum / period);
        }
        return result;
    };

    const sma20 = calculateSMA(displayPrices, 20);
    const sma50 = calculateSMA(displayPrices, 50);

    return (
        <Plot
            data={[
                {
                    x: dates,
                    close: closes,
                    decreasing: { line: { color: '#ef4444' }, fillcolor: '#ef4444' } as any,
                    high: highs,
                    increasing: { line: { color: '#22c55e' }, fillcolor: '#22c55e' } as any,
                    line: { color: 'rgba(31,119,180,1)' },
                    low: lows,
                    open: opens,
                    type: 'candlestick',
                    xaxis: 'x',
                    yaxis: 'y',
                    name: ticker
                },
                {
                    x: dates,
                    y: sma20,
                    type: 'scatter',
                    mode: 'lines',
                    line: { color: '#fbbf24', width: 1.5 }, // Amber
                    name: 'SMA 20',
                    hoverinfo: 'y+name'
                },
                {
                    x: dates,
                    y: sma50,
                    type: 'scatter',
                    mode: 'lines',
                    line: { color: '#3b82f6', width: 1.5 }, // Blue
                    name: 'SMA 50',
                    hoverinfo: 'y+name'
                }
            ] as any}
            layout={{
                ...chartLayout,
                showlegend: true, // Enable legend for toggling
                legend: { x: 0, y: 1, orientation: 'h', font: { color: '#94a3b8' } }
            }}
            onRelayout={handleRelayout}
            style={{ width: "100%", height: "100%" }}
            useResizeHandler={true}
            config={{
                responsive: true,
                displayModeBar: true,
                modeBarButtonsToAdd: [
                    'drawline',
                    'drawopenpath',
                    'drawclosedpath',
                    'drawcircle',
                    'drawrect',
                    'eraseshape'
                ] as any[]
            }}
        />
    );
}
