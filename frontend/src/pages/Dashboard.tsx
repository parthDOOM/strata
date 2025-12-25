/**
 * Dashboard page component.
 *
 * Main landing page showing market overview and portfolio summary.
 */

import { Activity, TrendingUp, BarChart3, DollarSign } from "lucide-react";
import LivePriceChart from "@/components/charts/LivePriceChart";

export default function Dashboard() {
    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                    Overview of your portfolio and market activity
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Portfolio Value"
                    value="$124,500.00"
                    change="+2.5%"
                    icon={DollarSign}
                    positive
                />
                <StatCard
                    title="Day Change"
                    value="+$3,200.00"
                    change="+2.5%"
                    icon={TrendingUp}
                    positive
                />
                <StatCard
                    title="Total Trades"
                    value="156"
                    change="+12"
                    icon={Activity}
                    positive
                />
                <StatCard
                    title="Win Rate"
                    value="67.3%"
                    change="+1.2%"
                    icon={BarChart3}
                    positive
                />
            </div>

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
                <div className="card">
                    <h2 className="text-lg font-semibold mb-4">Watchlist</h2>
                    <p className="text-muted-foreground text-sm">
                        Your tracked assets and real-time prices.
                    </p>
                    <div className="mt-4 space-y-2">
                        {["AAPL", "MSFT", "GOOGL", "TSLA", "NVDA", "AMD"].map((ticker) => (
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

    return (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="font-medium">{ticker}</span>
            <span className={`font-mono ${data ? (data.price > 100 ? "text-green-500" : "text-muted-foreground") : "text-muted-foreground"}`}>
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
