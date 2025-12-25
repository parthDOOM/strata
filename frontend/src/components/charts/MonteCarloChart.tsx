/**
 * Monte Carlo simulation results chart.
 *
 * Displays mean price path with 95% confidence interval bands.
 */

import {
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ComposedChart,
} from "recharts";
import type { ChartDataPoint } from "@/services/simulation";

interface MonteCarloChartProps {
    data: ChartDataPoint[];
}

export function MonteCarloChart({ data }: MonteCarloChartProps) {
    // Calculate Y-axis domain with some padding
    const prices = data.flatMap((d) => [d.mean, d.upper, d.lower]);
    const minPrice = Math.min(...prices) * 0.95;
    const maxPrice = Math.max(...prices) * 1.05;

    // Format currency for tooltip
    const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

    // Custom tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-card border rounded-lg p-3 shadow-lg">
                    <p className="font-medium mb-2">Day {label}</p>
                    <div className="space-y-1 text-sm">
                        <p className="flex items-center gap-2">
                            <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: "#3b82f6" }}
                            />
                            <span className="text-muted-foreground">Mean:</span>
                            <span className="font-medium">
                                {formatCurrency(payload[0]?.value)}
                            </span>
                        </p>
                        <p className="flex items-center gap-2">
                            <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: "#22c55e" }}
                            />
                            <span className="text-muted-foreground">95th %:</span>
                            <span className="font-medium text-green-500">
                                {formatCurrency(payload[1]?.value)}
                            </span>
                        </p>
                        <p className="flex items-center gap-2">
                            <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: "#ef4444" }}
                            />
                            <span className="text-muted-foreground">5th %:</span>
                            <span className="font-medium text-red-500">
                                {formatCurrency(payload[2]?.value)}
                            </span>
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <ResponsiveContainer width="100%" height={400}>
            <ComposedChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
                <defs>
                    <linearGradient id="colorBand" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                    </linearGradient>
                </defs>

                <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    opacity={0.5}
                />

                <XAxis
                    dataKey="day"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    label={{
                        value: "Trading Days",
                        position: "bottom",
                        offset: 0,
                        fill: "hsl(var(--muted-foreground))",
                    }}
                />

                <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value.toFixed(0)}`}
                    domain={[minPrice, maxPrice]}
                    label={{
                        value: "Price ($)",
                        angle: -90,
                        position: "insideLeft",
                        fill: "hsl(var(--muted-foreground))",
                    }}
                />

                <Tooltip content={<CustomTooltip />} />

                <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(value) => (
                        <span className="text-sm text-muted-foreground">{value}</span>
                    )}
                />

                {/* Mean Path - Primary line */}
                <Line
                    type="monotone"
                    dataKey="mean"
                    name="Mean Path"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2 }}
                />

                {/* Upper Bound - 95th percentile */}
                <Line
                    type="monotone"
                    dataKey="upper"
                    name="95th Percentile"
                    stroke="#22c55e"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                />

                {/* Lower Bound - 5th percentile */}
                <Line
                    type="monotone"
                    dataKey="lower"
                    name="5th Percentile"
                    stroke="#ef4444"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                />
            </ComposedChart>
        </ResponsiveContainer>
    );
}

export default MonteCarloChart;
