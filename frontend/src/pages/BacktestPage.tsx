import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Play, TrendingUp, TrendingDown, Activity, Scale, Grid } from "lucide-react";
import EquityCurve from "@/components/charts/EquityCurve";
import { useNavigate } from "react-router-dom";

interface SensitivityPoint {
    entry_z: number;
    exit_z: number;
    sharpe_ratio: number;
    total_return: number;
    win_rate: number;
    trades: number;
}

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
    sensitivity_matrix?: SensitivityPoint[];
}

interface BacktestParams {
    ticker_1: string;
    ticker_2: string;
    entry_z: number;
    exit_z: number;
    stop_loss_z: number;

    // Grid Search
    entry_z_min?: number;
    entry_z_max?: number;
    entry_z_step?: number;
    exit_z_min?: number;
    exit_z_max?: number;
    exit_z_step?: number;
}

export default function BacktestPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [isOptimizationMode, setIsOptimizationMode] = useState(false);

    // Default params from URL or standard
    const [params, setParams] = useState<BacktestParams>({
        ticker_1: searchParams.get("t1") || "MSFT",
        ticker_2: searchParams.get("t2") || "AAPL",
        entry_z: 2.0,
        exit_z: 0.0,
        stop_loss_z: 4.0,

        entry_z_min: 1.5,
        entry_z_max: 3.0,
        entry_z_step: 0.5,
        exit_z_min: -0.5,
        exit_z_max: 1.0,
        exit_z_step: 0.5
    });

    const backtestMutation = useMutation({
        mutationFn: async (data: BacktestParams) => {
            // Filter params based on mode
            const payload = { ...data };
            if (!isOptimizationMode) {
                delete payload.entry_z_min;
                delete payload.entry_z_max;
                delete payload.entry_z_step;
                delete payload.exit_z_min;
                delete payload.exit_z_max;
                delete payload.exit_z_step;
            }
            const res = await api.post<BacktestResults>("/backtest/pairs", payload);
            return res.data;
        }
    });

    const handleRun = () => {
        backtestMutation.mutate(params);
    };

    // Helper to render heatmap
    const renderHeatmap = (matrix: SensitivityPoint[]) => {
        if (!matrix || matrix.length === 0) return null;

        // Get unique X (Entry) and Y (Exit) values sorted
        const entryValues = Array.from(new Set(matrix.map(p => p.entry_z))).sort((a, b) => a - b);
        const exitValues = Array.from(new Set(matrix.map(p => p.exit_z))).sort((a, b) => b - a); // Descending for Y axis

        const getColor = (sharpe: number) => {
            if (sharpe < 0) return "bg-red-500/20 text-red-700";
            if (sharpe < 1) return "bg-yellow-500/20 text-yellow-700";
            if (sharpe < 2) return "bg-green-500/20 text-green-700";
            return "bg-green-500/50 text-green-900 font-bold";
        };

        return (
            <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                    <div className="grid gap-1" style={{ gridTemplateColumns: `auto repeat(${entryValues.length}, minmax(60px, 1fr))` }}>
                        {/* Header Row */}
                        <div className="h-10 flex items-center justify-center font-bold text-xs text-muted-foreground">Exit \ Entry</div>
                        {entryValues.map(v => (
                            <div key={v} className="h-10 flex items-center justify-center font-bold text-sm border-b">{v.toFixed(1)}</div>
                        ))}

                        {/* Rows */}
                        {exitValues.map(exitVal => (
                            <>
                                {/* Row Header */}
                                <div key={`h-${exitVal}`} className="h-16 flex items-center justify-center font-bold text-sm border-r pr-2">{exitVal.toFixed(1)}</div>

                                {/* Cells */}
                                {entryValues.map(entryVal => {
                                    const point = matrix.find(p => p.entry_z === entryVal && p.exit_z === exitVal);
                                    if (!point) return <div key={`${entryVal}-${exitVal}`} className="bg-muted/10" />;

                                    const tooltipText = `Sharpe: ${point.sharpe_ratio.toFixed(3)}\nReturn: ${(point.total_return * 100).toFixed(2)}%\nWin Rate: ${(point.win_rate * 100).toFixed(1)}%\nTrades: ${point.trades}`;

                                    return (
                                        <div
                                            key={`${entryVal}-${exitVal}`}
                                            title={tooltipText}
                                            className={`h-16 p-1 flex flex-col items-center justify-center text-xs rounded cursor-help transition-colors ${getColor(point.sharpe_ratio)}`}
                                        >
                                            <span className="font-bold">{point.sharpe_ratio.toFixed(2)}</span>
                                            <span className="text-[10px] opacity-75">{point.trades} trades</span>
                                        </div>
                                    );
                                })}
                            </>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col space-y-4 p-4 overflow-y-auto">
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
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium">Strategy Parameters</CardTitle>
                    <div className="flex items-center space-x-2">
                        <Label htmlFor="opt-mode" className="text-xs text-muted-foreground">Optimization Mode</Label>
                        <Switch id="opt-mode" checked={isOptimizationMode} onCheckedChange={setIsOptimizationMode} />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end mb-4">
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
                            <Label className={isOptimizationMode ? "text-muted-foreground" : ""}>Entry Z-Score</Label>
                            <Input
                                type="number" step="0.1"
                                disabled={isOptimizationMode}
                                value={params.entry_z}
                                onChange={e => setParams({ ...params, entry_z: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className={isOptimizationMode ? "text-muted-foreground" : ""}>Exit Z-Score</Label>
                            <Input
                                type="number" step="0.1"
                                disabled={isOptimizationMode}
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
                                {backtestMutation.isPending ? "Running..." : (isOptimizationMode ? "Run Optimization" : "Run Simulation")} {' '}
                                {!backtestMutation.isPending && (isOptimizationMode ? <Grid className="ml-2 h-4 w-4" /> : <Play className="ml-2 h-4 w-4" />)}
                            </Button>
                        </div>
                    </div>

                    {isOptimizationMode && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                            <div className="space-y-3">
                                <Label className="text-xs font-semibold text-primary">Entry Z Optimization Range</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    <div><Label className="text-[10px]">Min</Label><Input type="number" step="0.1" value={params.entry_z_min} onChange={e => setParams({ ...params, entry_z_min: parseFloat(e.target.value) })} /></div>
                                    <div><Label className="text-[10px]">Max</Label><Input type="number" step="0.1" value={params.entry_z_max} onChange={e => setParams({ ...params, entry_z_max: parseFloat(e.target.value) })} /></div>
                                    <div><Label className="text-[10px]">Step</Label><Input type="number" step="0.1" value={params.entry_z_step} onChange={e => setParams({ ...params, entry_z_step: parseFloat(e.target.value) })} /></div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <Label className="text-xs font-semibold text-primary">Exit Z Optimization Range</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    <div><Label className="text-[10px]">Min</Label><Input type="number" step="0.1" value={params.exit_z_min} onChange={e => setParams({ ...params, exit_z_min: parseFloat(e.target.value) })} /></div>
                                    <div><Label className="text-[10px]">Max</Label><Input type="number" step="0.1" value={params.exit_z_max} onChange={e => setParams({ ...params, exit_z_max: parseFloat(e.target.value) })} /></div>
                                    <div><Label className="text-[10px]">Step</Label><Input type="number" step="0.1" value={params.exit_z_step} onChange={e => setParams({ ...params, exit_z_step: parseFloat(e.target.value) })} /></div>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Results */}
            {backtestMutation.error && (
                <div className="p-4 rounded-md bg-destructive/10 text-destructive">
                    Error: {(backtestMutation.error as any).response?.data?.detail || backtestMutation.error.message}
                </div>
            )}

            {backtestMutation.data && (
                <div className="space-y-6">
                    {/* Sensitivity Heatmap (Only in Optimization Mode) */}
                    {backtestMutation.data.sensitivity_matrix && (
                        <Card className="border-primary/20 bg-primary/5">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Grid className="h-5 w-5" />
                                    Parameter Sensitivity (Sharpe Ratio)
                                </CardTitle>
                                <CardDescription>
                                    Heatmap showing Strategy Sharpe Ratio across different Entry/Exit thresholds.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {renderHeatmap(backtestMutation.data.sensitivity_matrix)}
                            </CardContent>
                        </Card>
                    )}

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
                            <Card className="h-full">
                                <CardHeader className="pb-0">
                                    <CardTitle>Equity Curve</CardTitle>
                                    <CardDescription>
                                        Performance of currently selected parameters (Entry: {params.entry_z}, Exit: {params.exit_z})
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="h-[450px]">
                                    <EquityCurve
                                        dates={backtestMutation.data.dates}
                                        strategyEquity={backtestMutation.data.equity_curve}
                                        benchmarkEquity={backtestMutation.data.benchmark_curve}
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
