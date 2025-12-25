import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Play, TrendingUp, TrendingDown, Activity, Scale } from "lucide-react";
import EquityCurve from "@/components/charts/EquityCurve";
import { useNavigate } from "react-router-dom";

interface BacktestResults {
    dates: string[];
    equity_curve: number[];
    benchmark_curve: number[];
    drawdown: number[];
    metrics: {
        total_return: number;
        sharpe_ratio: number;
        max_drawdown: number;
        win_rate: number;
        hedge_ratio: number;
    };
}

interface BacktestParams {
    ticker_1: string;
    ticker_2: string;
    entry_z: number;
    exit_z: number;
    stop_loss_z: number;
}

export default function BacktestPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // Default params from URL or standard
    const [params, setParams] = useState<BacktestParams>({
        ticker_1: searchParams.get("t1") || "MSFT",
        ticker_2: searchParams.get("t2") || "AAPL",
        entry_z: 2.0,
        exit_z: 0.0,
        stop_loss_z: 4.0
    });

    const backtestMutation = useMutation({
        mutationFn: async (data: BacktestParams) => {
            const res = await api.post<BacktestResults>("/backtest/pairs", data);
            return res.data;
        }
    });

    const handleRun = () => {
        backtestMutation.mutate(params);
    };

    return (
        <div className="h-full flex flex-col space-y-4 p-4">
            {/* Header / Nav */}
            <div className="flex items-center space-x-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Pairs Strategy Backtest</h1>
                    <p className="text-muted-foreground">
                        Simulate statistical arbitrage performance for {params.ticker_1} vs {params.ticker_2}
                    </p>
                </div>
            </div>

            {/* Controls */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Strategy Parameters</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                    <div className="space-y-2 col-span-1">
                        <Label>Ticker A (Long)</Label>
                        <Input
                            value={params.ticker_1}
                            onChange={e => setParams({ ...params, ticker_1: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2 col-span-1">
                        <Label>Ticker B (Short)</Label>
                        <Input
                            value={params.ticker_2}
                            onChange={e => setParams({ ...params, ticker_2: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Entry Z-Score</Label>
                        <Input
                            type="number" step="0.1"
                            value={params.entry_z}
                            onChange={e => setParams({ ...params, entry_z: parseFloat(e.target.value) })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Exit Z-Score</Label>
                        <Input
                            type="number" step="0.1"
                            value={params.exit_z}
                            onChange={e => setParams({ ...params, exit_z: parseFloat(e.target.value) })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Stop Loss Z</Label>
                        <Input
                            type="number" step="0.1"
                            value={params.stop_loss_z}
                            onChange={e => setParams({ ...params, stop_loss_z: parseFloat(e.target.value) })}
                        />
                    </div>
                    <div className="pb-0.5">
                        <Button onClick={handleRun} disabled={backtestMutation.isPending} className="w-full">
                            {backtestMutation.isPending ? "Running..." : "Run Simulation"} {' '}
                            {!backtestMutation.isPending && <Play className="ml-2 h-4 w-4" />}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Results */}
            {backtestMutation.error && (
                <div className="p-4 rounded-md bg-destructive/10 text-destructive">
                    Error: {(backtestMutation.error as any).response?.data?.detail || backtestMutation.error.message}
                </div>
            )}

            {backtestMutation.data && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full min-h-0">
                    {/* Metrics Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-1 gap-4 h-fit">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Return</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${backtestMutation.data.metrics.total_return >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {(backtestMutation.data.metrics.total_return * 100).toFixed(2)}%
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
                                <Activity className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {backtestMutation.data.metrics.sharpe_ratio.toFixed(2)}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
                                <TrendingDown className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-500">
                                    {(backtestMutation.data.metrics.max_drawdown * 100).toFixed(2)}%
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Hedge Ratio</CardTitle>
                                <Scale className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {backtestMutation.data.metrics.hedge_ratio.toFixed(3)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Long 1 {params.ticker_1} / Short {backtestMutation.data.metrics.hedge_ratio.toFixed(3)} {params.ticker_2}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Chart */}
                    <div className="md:col-span-3 h-[500px]">
                        <EquityCurve
                            dates={backtestMutation.data.dates}
                            strategyEquity={backtestMutation.data.equity_curve}
                            benchmarkEquity={backtestMutation.data.benchmark_curve}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
