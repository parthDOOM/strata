/**
 * 3D Implied Volatility Surface Chart.
 * 
 * Uses plotly.js (via react-plotly.js) to render a Mesh3D or Surface plot.
 */

import Plot from 'react-plotly.js';

interface IVSurfaceData {
    x: number[];
    y: number[];
    z: number[];
}

interface IVSurfaceChartProps {
    data: IVSurfaceData;
}

export default function IVSurfaceChart({ data }: IVSurfaceChartProps) {
    // Basic dark theme config
    const layout = {
        width: undefined, // undefined allows responsive autosize if wrapped?
        height: 600,
        autosize: true,
        title: { text: 'Implied Volatility Surface' },
        scene: {
            xaxis: { title: 'Strike Price ($)', gridcolor: '#333' },
            yaxis: { title: 'Days to Expiry', gridcolor: '#333' },
            zaxis: { title: 'Implied Volatility', gridcolor: '#333' },
            camera: {
                eye: { x: 1.5, y: 1.5, z: 1.2 }
            }
        },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: "#e2e8f0" }, // Slate-200ish
        margin: { l: 0, r: 0, b: 0, t: 30 }
    };

    return (
        <div className="w-full h-[600px]">
            <Plot
                data={[
                    {
                        type: 'mesh3d',
                        x: data.x,
                        y: data.y,
                        z: data.z,
                        intensity: data.z,
                        colorscale: 'Jet',
                        opacity: 0.9,
                        flatshading: false,
                        contour: {
                            show: true,
                        }
                    } as any
                ]}
                layout={layout as any}
                useResizeHandler={true}
                style={{ width: "100%", height: "100%" }}
                config={{ displayModeBar: true }}
            />
        </div>
    );
}
