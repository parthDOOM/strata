import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EquityCurveProps {
    dates: string[];
    strategyEquity: number[];
    benchmarkEquity: number[];
}

export default function EquityCurve({ dates, strategyEquity, benchmarkEquity }: EquityCurveProps) {
    // Transform arrays into object array for Recharts
    const data = dates.map((date, i) => ({
        date,
        strategy: strategyEquity[i],
        benchmark: benchmarkEquity[i]
    }));

    const formatPercent = (value: number) => {
        return `${((value - 1) * 100).toFixed(0)}%`;
    };

    return (
        <Card className="w-full h-full border-border bg-card">
            <CardHeader>
                <CardTitle>Equity Curve</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
                        <XAxis
                            dataKey="date"
                            stroke="#94a3b8"
                            tickFormatter={(value) => value.split('T')[0]}
                            minTickGap={50}
                        />
                        <YAxis
                            stroke="#94a3b8"
                            tickFormatter={formatPercent}
                            domain={['auto', 'auto']}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#f8fafc" }}
                            formatter={(value: number) => [`${((value - 1) * 100).toFixed(2)}%`, 'Return']}
                            labelStyle={{ color: "#94a3b8" }}
                        />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="strategy"
                            stroke="#22c55e"
                            strokeWidth={2}
                            name="Pairs Strategy"
                            dot={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="benchmark"
                            stroke="#64748b"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            name="Buy & Hold (Asset 1)"
                            dot={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
