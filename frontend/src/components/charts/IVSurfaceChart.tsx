/**
 * 3D Implied Volatility Surface Chart.
 * 
 * Uses plotly.js (via react-plotly.js) to render a Mesh3D or Surface plot.
 */

import { useState, useMemo, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';

interface IVSurfaceData {
    x: number[];
    y: number[];
    z: number[];
    delta?: number[];
    gamma?: number[];
    vega?: number[];
    theta?: number[];
    rho?: number[];
}

interface IVSurfaceChartProps {
    data: IVSurfaceData;
}

type Metric = 'IV' | 'Delta' | 'Gamma' | 'Vega' | 'Theta' | 'Rho';

export default function IVSurfaceChart({ data }: IVSurfaceChartProps) {
    const [metric, setMetric] = useState<Metric>('IV');
    const { theme } = useTheme();
    const [chartColor, setChartColor] = useState('#e2e8f0');

    // Detect effective theme for Plotly
    useEffect(() => {
        const isDark =
            theme === 'dark' ||
            (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

        // Slate-200 (light grey for dark mode) vs Slate-900 (black/dark for light mode)
        setChartColor(isDark ? '#e2e8f0' : '#0f172a');
    }, [theme]);

    // 1. Select the raw data based on the metric
    const rawMetricData = useMemo(() => {
        switch (metric) {
            case 'IV': return data.z;
            case 'Delta': return data.delta || [];
            case 'Gamma': return data.gamma || [];
            case 'Vega': return data.vega || [];
            case 'Theta': return data.theta || [];
            case 'Rho': return data.rho || [];
            default: return data.z;
        }
    }, [metric, data]);

    // 2. Data Cleaning
    // Filter out points where any coordinate or value is null/NaN to prevent blank charts
    const { cleanX, cleanY, cleanZ } = useMemo(() => {
        if (!rawMetricData || rawMetricData.length === 0) {
            return { cleanX: [], cleanY: [], cleanZ: [] };
        }

        const x = [];
        const y = [];
        const z = [];

        for (let i = 0; i < data.x.length; i++) {
            const val = rawMetricData[i];
            if (
                data.x[i] != null &&
                data.y[i] != null &&
                val != null &&
                !isNaN(val)
            ) {
                x.push(data.x[i]);
                y.push(data.y[i]);
                z.push(val);
            }
        }
        return { cleanX: x, cleanY: y, cleanZ: z };
    }, [data, rawMetricData]);

    const hasData = cleanZ.length > 0;

    // Theme-aware config - Using state for colors
    const layout = {
        width: undefined,
        height: 600,
        autosize: true,
        title: {
            text: `${metric} Surface`,
            font: { color: chartColor }
        },
        scene: {
            xaxis: { title: 'Strike Price ($)', gridcolor: '#333', color: chartColor },
            yaxis: { title: 'Days to Expiry', gridcolor: '#333', color: chartColor },
            zaxis: { title: metric, gridcolor: '#333', color: chartColor },
            camera: {
                eye: { x: 1.5, y: 1.5, z: 1.2 }
            }
        },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: chartColor },
        margin: { l: 0, r: 0, b: 0, t: 30 }
    };

    return (
        <div className="w-full space-y-4">
            <div className="flex flex-wrap gap-2 justify-center">
                {(['IV', 'Delta', 'Gamma', 'Vega', 'Theta', 'Rho'] as Metric[]).map((m) => (
                    <Button
                        key={m}
                        variant={metric === m ? "default" : "outline"}
                        size="sm"
                        onClick={() => setMetric(m)}
                        className="w-20"
                    >
                        {m}
                    </Button>
                ))}
            </div>

            <div className="w-full h-[600px] border rounded-lg overflow-hidden bg-muted/10">
                {hasData ? (
                    <Plot
                        data={[
                            {
                                type: 'mesh3d',
                                x: cleanX,
                                y: cleanY,
                                z: cleanZ,
                                intensity: cleanZ,
                                colorscale: 'Jet',
                                opacity: 0.9,
                                flatshading: false,
                                contour: {
                                    show: true,
                                    color: '#fff',
                                    width: 2
                                },
                                // Robust default settings
                                alphahull: -1
                            } as any
                        ]}
                        layout={layout as any}
                        useResizeHandler={true}
                        style={{ width: "100%", height: "100%" }}
                        config={{ displayModeBar: true, responsive: true }}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        No {metric} data available
                    </div>
                )}
            </div>

            {/* Axis Explanations */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground p-4 border rounded-lg bg-card/50">
                <div>
                    <span className="font-bold text-foreground">X-Axis: Strike Price ($)</span>
                    <p className="text-xs mt-1">
                        The price at which the option can be exercised. Higher strikes are to the right.
                    </p>
                </div>
                <div>
                    <span className="font-bold text-foreground">Y-Axis: Days to Expiry</span>
                    <p className="text-xs mt-1">
                        Number of days until the option contract expires. Longer dates are further back.
                    </p>
                </div>
                <div>
                    <span className="font-bold text-foreground">Z-Axis: {metric}</span>
                    <p className="text-xs mt-1">
                        {metric === 'IV' && "Implied Volatility: The market's expectation of future volatility."}
                        {metric === 'Delta' && "Delta: Measures change in option price per $1 change in the underlying asset."}
                        {metric === 'Gamma' && "Gamma: Rate of change of Delta. Highest for At-The-Money options."}
                        {metric === 'Vega' && "Vega: Sensitivity to changes in Implied Volatility."}
                        {metric === 'Theta' && "Theta: Time decay. How much value the option loses per day."}
                        {metric === 'Rho' && "Rho: Sensitivity to changes in risk-free interest rates."}
                    </p>
                </div>
            </div>
        </div>
    );
}
