/**
 * Live Price Chart Component.
 * Visualizes real-time price tick data.
 */
import { useEffect, useState } from "react";
import { LineChart, Line, YAxis, ResponsiveContainer } from "recharts";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface LivePriceChartProps {
    ticker: string;
}

const HISTORY_KEY_PREFIX = "live_chart_history_";
const MAX_HISTORY_AGE_MS = 10 * 60 * 1000; // 10 minutes

export default function LivePriceChart({ ticker }: LivePriceChartProps) {
    // using localhost:8000 for direct connection (proxy handling for WS can be tricky)
    const [history, setHistory] = useState<any[]>([]);
    const { data, isConnected } = useWebSocket(`ws://127.0.0.1:8000/api/v1/stream/ws/live/${ticker}`);

    // Load history from local storage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(HISTORY_KEY_PREFIX + ticker);
            if (saved) {
                const parsed = JSON.parse(saved);
                const age = Date.now() - parsed.lastUpdated;

                // Only restore if data is recent (stale data causes flat lines/jumps)
                if (age < MAX_HISTORY_AGE_MS && Array.isArray(parsed.ticks)) {
                    setHistory(parsed.ticks);
                }
            }
        } catch (e) {
            console.error("Failed to load chart history", e);
        }
    }, [ticker]);

    // Save history to local storage whenever it updates
    useEffect(() => {
        if (history.length > 0) {
            const payload = {
                lastUpdated: Date.now(),
                ticks: history
            };
            localStorage.setItem(HISTORY_KEY_PREFIX + ticker, JSON.stringify(payload));
        }
    }, [history, ticker]);

    // Update state with new WS data
    useEffect(() => {
        if (data) {
            setHistory(prev => {
                const newHistory = [...prev, data];
                // Keep the window moving (last 50 points)
                if (newHistory.length > 50) return newHistory.slice(-50);
                return newHistory;
            });
        }
    }, [data]);

    const latestPrice = history.length > 0 ? history[history.length - 1].price : 0;
    const prevPrice = history.length > 1 ? history[history.length - 2].price : latestPrice;
    const isUp = latestPrice >= prevPrice;
    const color = isUp ? "#22c55e" : "#ef4444"; // green-500 : red-500

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {ticker}
                </CardTitle>
                {isConnected ?
                    <Wifi className="h-4 w-4 text-green-500" /> :
                    <WifiOff className="h-4 w-4 text-red-500" />
                }
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold flex items-center gap-2">
                    {latestPrice ? `$${latestPrice.toFixed(2)}` : "Loading..."}
                    {latestPrice > 0 && (
                        <span className={cn("text-xs flex items-center", isUp ? "text-green-500" : "text-red-500")}>
                            {isUp ? "+" : ""}{(latestPrice - prevPrice).toFixed(2)}
                        </span>
                    )}
                </div>
                <div className="h-[200px] mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={history}>
                            <Line
                                type="monotone"
                                dataKey="price"
                                stroke={color}
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false} // Performance
                            />
                            {/* Min/Max domain to make chart dynamic */}
                            <YAxis
                                domain={['auto', 'auto']}
                                hide={true}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
