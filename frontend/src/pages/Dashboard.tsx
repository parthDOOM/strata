/**
 * Dashboard page component.
 *
 * Main landing page showing market overview and portfolio summary.
 */

import { Activity, TrendingUp, BarChart3, DollarSign } from "lucide-react";
import LivePriceChart from "@/components/charts/LivePriceChart";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { usePortfolio } from "@/context/PortfolioContext";

export default function Dashboard() {
    const { activePortfolioId } = usePortfolio();

    // Fetch portfolio performance for accurate metrics
    const { data: performance } = useQuery({
        queryKey: ["portfolio", activePortfolioId, "performance"],
        queryFn: async () => {
            if (!activePortfolioId) return null;
            const res = await api.get<{ total_value: number; daily_return_pct: number }>(`/portfolio/${activePortfolioId}/performance`);
            return res.data;
        },
        enabled: !!activePortfolioId,
        refetchInterval: 60000,
    });

    const totalValue = performance?.total_value || 0;
    const dailyReturnPct = performance?.daily_return_pct || 0;

    // Calculate approximate dollar change from percentage: Value - (Value / (1 + pct/100))
    const previousValue = totalValue / (1 + (dailyReturnPct / 100));
    const dayChangeValue = totalValue - previousValue;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                    Overview of your portfolio and market activity
                </p>
            </div>

            {/* Stats Grid - Only show if a portfolio is selected */}
            {activePortfolioId && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="Portfolio Value"
                        value={`$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        change={`${dailyReturnPct >= 0 ? "+" : ""}${dailyReturnPct.toFixed(1)}%`}
                        icon={DollarSign}
                        positive={dailyReturnPct >= 0}
                    />
                    <StatCard
                        title="Day Change"
                        value={`${dayChangeValue >= 0 ? "+" : "-"}$${Math.abs(dayChangeValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        change={`${dailyReturnPct >= 0 ? "+" : ""}${dailyReturnPct.toFixed(1)}%`}
                        icon={TrendingUp}
                        positive={dailyReturnPct >= 0}
                    />
                    <StatCard
                        title="Total Trades"
                        value="0" // Placeholder
                        change="+0"
                        icon={Activity}
                        positive
                    />
                    <StatCard
                        title="Win Rate"
                        value="0.0%" // Placeholder
                        change="+0.0%"
                        icon={BarChart3}
                        positive
                    />
                </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Market Overview Card */}
                {/* Market Overview Card */}
                <div className="card lg:col-span-2">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        Market Overview (Live)
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <LivePriceChart ticker="SPY" />
                        <LivePriceChart ticker="BTC-USD" />
                        <LivePriceChart ticker="ETH-USD" />
                    </div>
                </div>

                {/* Watchlist Card */}
                <div className="card lg:col-span-2">
                    <h2 className="text-lg font-semibold mb-4">Watchlist</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {[
                            "AAPL", "MSFT", "GOOGL", "TSLA", "NVDA", "AMD",
                            "AMZN", "META", "NFLX", "INTC", "QCOM", "IBM",
                            "JPM", "BAC", "WMT", "DIS", "KO", "PEP"
                        ].map((ticker) => (
                            <WatchlistItem key={ticker} ticker={ticker} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

import { useWebSocket } from "@/hooks/useWebSocket";

function WatchlistItem({ ticker }: { ticker: string }) {
    const { data } = useWebSocket(`ws://127.0.0.1:8000/api/v1/stream/ws/live/${ticker}`);

    // Determine color based on change (if available) or fallback to grey
    const isPositive = data?.change ? data.change >= 0 : true;
    const colorClass = data
        ? (isPositive ? "text-green-500" : "text-red-500")
        : "text-muted-foreground";

    return (
        <div className="flex flex-col items-center justify-center p-2 bg-muted/50 rounded-md hover:bg-muted transition-colors cursor-pointer">
            <span className="font-bold text-base">{ticker}</span>
            <span className={`font-mono text-sm ${colorClass}`}>
                {data ? `$${data.price.toFixed(2)}` : "Loading..."}
            </span>
        </div>
    );
}

/**
 * Stat card component for displaying key metrics.
 */
interface StatCardProps {
    title: string;
    value: string;
    change: string;
    icon: React.ElementType;
    positive?: boolean;
}

function StatCard({ title, value, change, icon: Icon, positive }: StatCardProps) {
    return (
        <div className="card">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-muted-foreground">{title}</p>
                    <p className="text-xl font-bold mt-1 text-card-foreground">{value}</p>
                </div>
                <div
                    className={`p-3 rounded-lg ${positive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                        }`}
                >
                    <Icon className="w-5 h-5" />
                </div>
            </div>
            <p
                className={`text-sm mt-2 ${positive ? "text-green-500" : "text-red-500"
                    }`}
            >
                {change} from yesterday
            </p>
        </div>
    );
}
