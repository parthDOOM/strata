/**
 * Portfolio Optimization Page.
 * Uses Hierarchical Risk Parity (HRP) to allocate weights.
 */
import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Loader2, Play, PieChart as PieChartIcon } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

import { MultiTickerSelect } from "@/components/MultiTickerSelect";

interface Allocation {
    ticker: string;
    weight: number;
}

interface OptimizationResponse {
    allocations: Allocation[];
    risk_metric: string;
}

const COLORS = [
    "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8",
    "#82ca9d", "#a4de6c", "#d0ed57", "#ffc658", "#ff7300",
    "#387908", "#38abc8", "#6c38c8", "#b638c8", "#c83887"
];

export default function PortfolioOptimization() {
    const [selectedTickers, setSelectedTickers] = useState<string[]>([]);
    const [allocations, setAllocations] = useState<Allocation[]>([]);
    const [loading, setLoading] = useState(false);

    const handleOptimize = async () => {
        if (selectedTickers.length < 2) {
            toast.error("Please select at least 2 tickers.");
            return;
        }

        setLoading(true);
        try {
            const res = await api.post<OptimizationResponse>("/portfolio/optimize/hrp", {
                tickers: selectedTickers
            });
            setAllocations(res.data.allocations);
            toast.success("Optimization complete!");
        } catch (error: any) {
            toast.error("Optimization failed", {
                description: error.response?.data?.detail || error.message
            });
        } finally {
            setLoading(false);
        }
    };

    const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        if (percent < 0.05) return null; // Hide small labels

        return (
            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <PieChartIcon className="w-8 h-8 text-primary" />
                    Portfolio Optimization
                </h1>
                <p className="text-muted-foreground">
                    Optimize portfolio weights using Hierarchical Risk Parity (HRP).
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Controls */}
                <Card className="md:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle>Configuration</CardTitle>
                        <CardDescription>Select assets to include in the portfolio.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Assets</label>
                            <MultiTickerSelect
                                selected={selectedTickers}
                                onChange={setSelectedTickers}
                            />
                            <p className="text-xs text-muted-foreground">
                                {selectedTickers.length} assets selected
                            </p>
                        </div>

                        <Separator />

                        <Button
                            className="w-full"
                            onClick={handleOptimize}
                            disabled={loading || selectedTickers.length < 2}
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Play className="w-4 h-4 mr-2" />
                            )}
                            Optimize Portfolio
                        </Button>
                    </CardContent>
                </Card>

                {/* Right Column: Results */}
                <Card className="md:col-span-2 min-h-[500px] flex flex-col">
                    <CardHeader>
                        <CardTitle>Optimal Allocation</CardTitle>
                        <CardDescription>
                            {allocations.length > 0
                                ? "Recommended weights based on volatility clustering."
                                : "Run optimization to see results."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col lg:flex-row gap-8">
                        {allocations.length > 0 ? (
                            <>
                                {/* Pie Chart */}
                                <div className="flex-1 min-h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={allocations}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={renderCustomLabel}
                                                outerRadius={100}
                                                fill="#8884d8"
                                                dataKey="weight"
                                                nameKey="ticker"
                                            >
                                                {allocations.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value: number) => `${(value * 100).toFixed(2)}%`} />
                                            <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Table */}
                                <div className="flex-1">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Asset</TableHead>
                                                <TableHead className="text-right">Weight</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {allocations.map((a) => (
                                                <TableRow key={a.ticker}>
                                                    <TableCell className="font-medium">{a.ticker}</TableCell>
                                                    <TableCell className="text-right">
                                                        {(a.weight * 100).toFixed(2)}%
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg m-4">
                                <p>Select assets and click Optimize</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
