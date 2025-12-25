/**
 * Statistical Arbitrage Page.
 *
 * Analyzes cointegration and visualizes data series.
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
    ResponsiveContainer
} from "recharts";
import { Play, TrendingUp, Activity, RotateCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import { getTickers } from "@/services/market"; // Import market service
import { analyzePairs, getPairs, getSpread, type CointegratedPair } from "@/services/statarb";

import { useNavigate } from "react-router-dom";

// Mock universe for demo purposes, in reality this would come from a comprehensive list or selection
// Mock universe: Includes diverse sectors (Tech, Finance, Energy, Healthcare, Consumer) to increase cointegration chances
const DEFAULT_UNIVERSE = [
    // Tech
    "AAPL", "MSFT", "GOOG", "AMZN", "META", "TSLA", "NVDA", "AMD", "INTC", "CRM",
    // Finance
    "JPM", "BAC", "WFC", "C", "GS", "MS", "V", "MA", "AXP",
    // Energy
    "XOM", "CVX", "COP", "SLB", "EOG",
    // Healthcare
    "JNJ", "PFE", "MRK", "ABBV", "LLY", "UNH",
    // Consumer
    "PG", "KO", "PEP", "WMT", "COST", "DIS", "MCD", "NKE", "SBUX",
    // Industrial & Utils
    "BA", "CAT", "GE", "UNP", "UPS", "NEE", "SO"
];

export default function StatArbPage() {
    const navigate = useNavigate();
    const [selectedPair, setSelectedPair] = useState<CointegratedPair | null>(null);

    // Queries
    const tickersQuery = useQuery({
        queryKey: ["tickers"],
        queryFn: getTickers,
    });

    const pairsQuery = useQuery({
        queryKey: ["pairs"],
        queryFn: getPairs,
    });

    const spreadQuery = useQuery({
        queryKey: ["spread", selectedPair?.ticker_1, selectedPair?.ticker_2],
        queryFn: () => {
            if (!selectedPair) return Promise.resolve([]);
            return getSpread(selectedPair.ticker_1, selectedPair.ticker_2);
        },
        enabled: !!selectedPair,
    });

    // Mutations
    const analyzeMutation = useMutation({
        mutationFn: analyzePairs,
        onSuccess: () => {
            toast.success("Analysis started", {
                description: "This task runs in the background. Results will appear when complete.",
            });
            // In a real app we'd poll or use websockets, here we'll just invalidate after a delay manually or assume user refreshes
        },
        onError: (error: Error) => {
            toast.error("Analysis failed", {
                description: error.message,
            });
        },
    });

    const handleRunAnalysis = () => {
        // Use the expanded DEFAULT_UNIVERSE to ensure we scan for potential pairs
        // The backend will only process tickers that have data, so passing extra ones is safe
        // This fixes the issue where only previously seeded tickers (20) were being scanned
        const tickers = DEFAULT_UNIVERSE;
        analyzeMutation.mutate(tickers);
    };

    const handleSelectPair = (pair: CointegratedPair) => {
        setSelectedPair(pair);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <TrendingUp className="w-7 h-7 text-primary" />
                        Pairs Trading Strategy
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Identify cointegrated asset pairs for mean-reversion trading
                    </p>
                </div>
                <Button
                    onClick={handleRunAnalysis}
                    disabled={analyzeMutation.isPending}
                    size="lg"
                >
                    {analyzeMutation.isPending ? (
                        <RotateCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Play className="w-4 h-4 mr-2" />
                    )}
                    Run Analysis
                </Button>
            </div>

            {/* Top Analysis Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Pairs Identified</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pairsQuery.data?.length || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Significant at p &lt; 0.05
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Active Universe</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {tickersQuery.data?.count || DEFAULT_UNIVERSE.length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Tickers scans
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Best P-Value</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {pairsQuery.data?.length
                                ? Math.min(...pairsQuery.data.map(p => p.p_value)).toExponential(2)
                                : "-"}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Cointegration confidence
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Visualization Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Pairs List */}
                <Card className="lg:col-span-1 h-[600px] flex flex-col">
                    <CardHeader>
                        <CardTitle>Identified Pairs</CardTitle>
                        <CardDescription>Select a pair to visualize spread</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto p-0">
                        {pairsQuery.isLoading ? (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                Loading pairs...
                            </div>
                        ) : pairsQuery.data?.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 text-center">
                                <Activity className="w-10 h-10 mb-2 opacity-20" />
                                <p>No cointegrated pairs found.</p>
                                <p className="text-sm">Try running analysis again.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Pair</TableHead>
                                        <TableHead className="text-right">Z-Score</TableHead>
                                        <TableHead className="text-right">Half-Life</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pairsQuery.data?.map((pair) => (
                                        <TableRow
                                            key={pair.id}
                                            className={`cursor-pointer ${selectedPair?.id === pair.id ? "bg-muted/50" : ""}`}
                                            onClick={() => handleSelectPair(pair)}
                                        >
                                            <TableCell className="font-medium">
                                                {pair.ticker_1} / {pair.ticker_2}
                                            </TableCell>
                                            <TableCell className={`text-right ${Math.abs(pair.last_z_score) > 2 ? "font-bold text-primary" : ""}`}>
                                                {pair.last_z_score.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right text-muted-foreground">
                                                {Math.round(pair.half_life)}d
                                            </TableCell>
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    onClick={() => navigate(`/backtest/pairs?t1=${pair.ticker_1}&t2=${pair.ticker_2}`)}
                                                >
                                                    <Play className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Main Visualization */}
                <Card className="lg:col-span-2 h-[600px] flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {selectedPair ? `${selectedPair.ticker_1} vs ${selectedPair.ticker_2} Spread` : "Spread Visualization"}
                        </CardTitle>
                        <CardDescription>
                            {selectedPair
                                ? `Hedge Ratio: ${selectedPair.hedge_ratio.toFixed(4)} | P-Value: ${selectedPair.p_value.toExponential(2)}`
                                : "Select a pair to view Z-Score mean reversion"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-[400px]">
                        {!selectedPair ? (
                            <div className="flex items-center justify-center h-full text-muted-foreground bg-muted/10 rounded-lg border-2 border-dashed">
                                Select a pair from the list
                            </div>
                        ) : spreadQuery.isLoading ? (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                Calculation spread...
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={spreadQuery.data || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorZ" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorZNeg" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(t) => t.split('T')[0]}
                                        minTickGap={30}
                                        fontSize={12}
                                    />
                                    <YAxis domain={['auto', 'auto']} fontSize={12} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                                        labelFormatter={(l) => l.split('T')[0]}
                                    />
                                    <ReferenceLine y={2} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label="Short +2.0" />
                                    <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" label="Mean 0.0" />
                                    <ReferenceLine y={-2} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label="Long -2.0" />

                                    <Area
                                        type="monotone"
                                        dataKey="z_score"
                                        stroke="#10b981"
                                        fillOpacity={1}
                                        fill="url(#colorZ)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
