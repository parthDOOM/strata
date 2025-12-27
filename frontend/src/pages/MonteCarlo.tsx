/**
 * Monte Carlo Simulation page.
 *
 * Interactive interface for running price path simulations.
 */

import { useState, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dice6, Play, TrendingUp, TrendingDown, Activity, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";

import { Info } from "lucide-react";
import { TickerSearch } from "@/components/TickerSearch";
import { getTickers } from "@/services/market";
// using a simple div instead of missing Alert component
import {
    runSimulation,
    transformToChartData,
    type SimulationRequest,
} from "@/services/simulation";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { MonteCarloChart } from "@/components/charts";

export default function MonteCarlo() {
    // Form state
    const [ticker, setTicker] = useState("AAPL");
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setFullYear(date.getFullYear() - 1);
        return date.toISOString().split("T")[0];
    });
    const [endDate, setEndDate] = useState(() => {
        return new Date().toISOString().split("T")[0];
    });
    const [numSimulations, setNumSimulations] = useState(10000);
    const [numSteps, setNumSteps] = useState(252);

    // Mutation for running simulation
    const mutation = useMutation({
        mutationFn: runSimulation,
        onSuccess: (data) => {
            toast.success(`Simulation complete for ${data.ticker}`, {
                description: `Ran ${data.parameters.num_simulations.toLocaleString()} simulations`,
            });
        },
        onError: (error: Error) => {
            toast.error("Simulation failed", {
                description: error.message,
            });
        },
    });

    // Transform data for chart
    const chartData = useMemo(() => {
        if (!mutation.data) return null;
        return transformToChartData(mutation.data);
    }, [mutation.data]);

    // Fetch tickers for autocomplete
    const tickersQuery = useQuery({
        queryKey: ["tickers"],
        queryFn: getTickers,
    });

    // Handle form submission
    const handleRunSimulation = () => {
        const request: SimulationRequest = {
            ticker: ticker.toUpperCase(),
            start_date: startDate,
            end_date: endDate,
            num_simulations: numSimulations,
            num_steps: numSteps,
        };
        mutation.mutate(request);
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-3">
                    <Dice6 className="w-7 h-7 text-primary" />
                    Monte Carlo Simulation
                </h1>
                <p className="text-muted-foreground mt-1">
                    Run price path simulations using Geometric Brownian Motion
                </p>
            </div>

            {/* Simulation Info Alert - Custom Styled Div */}
            <div className="bg-muted/50 border border-primary/20 rounded-lg p-4 flex gap-3 items-start">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm">
                    <h5 className="font-medium mb-1">About this Simulation</h5>
                    <p className="text-muted-foreground">
                        This tool uses a <strong>C++ Accelerated Geometric Brownian Motion (GBM)</strong> engine to generate {numSimulations.toLocaleString()} future price paths based on historical volatility and drift.
                        It calculates <strong>VaR (Value at Risk)</strong> to estimate maximum potential loss at a specific confidence level, and <strong>CVaR (Conditional VaR)</strong> to measure the average loss in the worst-case tail scenarios.
                    </p>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Controls Panel */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg">Configuration</CardTitle>
                        <CardDescription>
                            Set parameters for the simulation
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Ticker Input */}
                        <div className="space-y-2 z-50 relative">
                            <Label htmlFor="ticker">Ticker Symbol</Label>
                            <TickerSearch
                                tickers={tickersQuery.data?.tickers.map(t => ({
                                    symbol: t.symbol,
                                    name: t.name || ""
                                })) || []}
                                onSelect={(val) => setTicker(val)}
                                placeholder="Search (e.g. AAPL, BTC-USD)"
                            />
                            {/* Hidden input for controlled state visualization/debug if needed, mostly handled by TickerSearch now */}
                            <div className="text-xs text-muted-foreground mt-1">
                                Selected: <span className="font-mono font-medium text-foreground">{ticker}</span>
                            </div>
                        </div>

                        {/* Date Range */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start-date">Start Date</Label>
                                <Input
                                    id="start-date"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end-date">End Date</Label>
                                <Input
                                    id="end-date"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* Simulation Count */}
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <Label>Simulations</Label>
                                <span className="text-sm text-muted-foreground font-mono">
                                    {numSimulations.toLocaleString()}
                                </span>
                            </div>
                            <Slider
                                value={[numSimulations]}
                                onValueChange={([value]) => setNumSimulations(value)}
                                min={100}
                                max={50000}
                                step={100}
                            />
                            <p className="text-xs text-muted-foreground">
                                More simulations = more accurate results
                            </p>
                        </div>

                        {/* Projection Days */}
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <Label>Projection Days</Label>
                                <span className="text-sm text-muted-foreground font-mono">
                                    {numSteps}
                                </span>
                            </div>
                            <Slider
                                value={[numSteps]}
                                onValueChange={([value]) => setNumSteps(value)}
                                min={21}
                                max={504}
                                step={21}
                            />
                            <p className="text-xs text-muted-foreground">
                                Trading days to project (252 = 1 year)
                            </p>
                        </div>

                        <Separator />

                        {/* Run Button */}
                        <Button
                            className="w-full"
                            size="lg"
                            onClick={handleRunSimulation}
                            disabled={mutation.isPending || !ticker}
                        >
                            {mutation.isPending ? (
                                <>
                                    <Activity className="w-4 h-4 mr-2 animate-spin" />
                                    Running...
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4 mr-2" />
                                    Run Simulation
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Results Panel */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg">Simulation Results</CardTitle>
                        <CardDescription>
                            {mutation.data
                                ? `${mutation.data.ticker} - ${mutation.data.parameters.num_simulations.toLocaleString()} paths`
                                : "Run a simulation to see price projections"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Error State */}
                        {mutation.isError && (
                            <div className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive rounded-lg mb-4">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <p className="text-sm">{mutation.error.message}</p>
                            </div>
                        )}

                        {/* Loading State */}
                        {mutation.isPending && (
                            <div className="h-[400px] flex items-center justify-center">
                                <div className="text-center">
                                    <Activity className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
                                    <p className="text-muted-foreground">
                                        Running {numSimulations.toLocaleString()} simulations...
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Empty State */}
                        {!mutation.data && !mutation.isPending && !mutation.isError && (
                            <div className="h-[400px] flex items-center justify-center">
                                <div className="text-center text-muted-foreground">
                                    <Dice6 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                    <p>Configure parameters and run a simulation</p>
                                    <p className="text-sm mt-1">to see projected price paths</p>
                                </div>
                            </div>
                        )}

                        {/* Chart */}
                        {chartData && mutation.data && !mutation.isPending && (
                            <>
                                <MonteCarloChart
                                    data={chartData}
                                />

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                                    <StatCard
                                        label="Starting Price"
                                        value={formatCurrency(mutation.data.parameters.s0)}
                                        icon={Activity}
                                    />
                                    <StatCard
                                        label="Expected Final"
                                        value={formatCurrency(mutation.data.results.final_price.mean)}
                                        icon={TrendingUp}
                                        change={
                                            (mutation.data.results.final_price.mean -
                                                mutation.data.parameters.s0) /
                                            mutation.data.parameters.s0
                                        }
                                    />
                                    <StatCard
                                        label="95th Percentile"
                                        value={formatCurrency(mutation.data.results.percentile_95[mutation.data.results.percentile_95.length - 1])}
                                        icon={TrendingUp}
                                        positive
                                        helperText="Upside Scenario (Best 5%)"
                                    />
                                    <StatCard
                                        label="5th Percentile"
                                        value={formatCurrency(mutation.data.results.percentile_05[mutation.data.results.percentile_05.length - 1])}
                                        icon={TrendingDown}
                                        positive={false}
                                        helperText="Downside Risk (Worst 5%)"
                                    />
                                </div>

                                {/* Parameters Info */}
                                <>
                                    {/* Tail Risk Analytics */}
                                    {mutation.data.results.tail_risk && (
                                        <div className="mt-8">
                                            <h4 className="flex items-center gap-2 text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">
                                                <AlertCircle className="w-4 h-4" />
                                                Tail Risk Analytics
                                            </h4>
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                <StatCard
                                                    label="VaR (95%)"
                                                    value={formatCurrency(mutation.data.results.tail_risk.var_95)}
                                                    icon={TrendingDown}
                                                    positive={false}
                                                    change={-(mutation.data.results.tail_risk.var_95 / mutation.data.parameters.s0)}
                                                    helperText="Value at Risk (95%)"
                                                />
                                                <StatCard
                                                    label="CVaR (95%)"
                                                    value={formatCurrency(mutation.data.results.tail_risk.cvar_95)}
                                                    icon={Activity}
                                                    positive={false}
                                                    change={-(mutation.data.results.tail_risk.cvar_95 / mutation.data.parameters.s0)}
                                                    helperText="Expected Shortfall (Avg of 5%)"
                                                />
                                                <StatCard
                                                    label="VaR (99%)"
                                                    value={formatCurrency(mutation.data.results.tail_risk.var_99)}
                                                    icon={TrendingDown}
                                                    positive={false}
                                                    change={-(mutation.data.results.tail_risk.var_99 / mutation.data.parameters.s0)}
                                                    helperText="Value at Risk (Extreme)"
                                                />
                                                <StatCard
                                                    label="CVaR (99%)"
                                                    value={formatCurrency(mutation.data.results.tail_risk.cvar_99)}
                                                    icon={Activity}
                                                    positive={false}
                                                    change={-(mutation.data.results.tail_risk.cvar_99 / mutation.data.parameters.s0)}
                                                    helperText="Expected Shortfall (Extreme)"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                                        <p className="text-sm text-muted-foreground">
                                            <strong>Parameters:</strong> μ = {(mutation.data.parameters.mu * 100).toFixed(2)}% (drift),
                                            σ = {(mutation.data.parameters.sigma * 100).toFixed(2)}% (volatility),
                                            using {mutation.data.parameters.data_points_used} historical data points
                                        </p>
                                    </div>
                                </>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

/**
 * Stat card component for displaying key metrics.
 */
interface StatCardProps {
    label: string;
    value: string;
    icon: React.ElementType;
    change?: number;
    positive?: boolean;
    helperText?: string;
}

function StatCard({ label, value, icon: Icon, change, positive, helperText }: StatCardProps) {
    const showChange = change !== undefined;
    const isPositive = positive ?? (change !== undefined ? change >= 0 : true);

    return (
        <div className="p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
                <Icon
                    className={`w-4 h-4 ${isPositive ? "text-green-500" : "text-red-500"
                        }`}
                />
                <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className="text-lg font-bold">{value}</p>
            {showChange && (
                <p
                    className={`text-xs mt-1 ${isPositive ? "text-green-500" : "text-red-500"
                        }`}
                >
                    {isPositive ? "+" : ""}
                    {formatPercent(change)}
                </p>
            )}
            {helperText && (
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2 opacity-70">
                    {helperText}
                </p>
            )}
        </div>
    );
}
