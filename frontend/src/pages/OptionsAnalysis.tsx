/**
 * Options Analysis Page.
 *
 * Visualizing Implied Volatility Surface in 3D.
 */

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Search, Loader2, Layers } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IVSurfaceResponse, getIVSurface } from "@/services/options";
import IVSurfaceChart from "@/components/charts/IVSurfaceChart";

export default function OptionsAnalysis() {
    const [ticker, setTicker] = useState("SPY");
    const [data, setData] = useState<IVSurfaceResponse | null>(null);

    const mutation = useMutation({
        mutationFn: getIVSurface,
        onSuccess: (result) => {
            setData(result);
            toast.success(`Fetched ${result.count} data points for ${result.ticker}`);
        },
        onError: (error: Error) => {
            toast.error("Failed to fetch options data", {
                description: error.message,
            });
        },
    });

    const handleFetch = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!ticker) return;
        mutation.mutate(ticker);
    };

    return (
        <div className="space-y-6">
            {/* Header / Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <Layers className="w-7 h-7 text-primary" />
                        Options Analysis
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        3D Implied Volatility Surface Visualization
                    </p>
                </div>

                <form onSubmit={handleFetch} className="flex gap-2 w-full sm:w-auto">
                    <Input
                        value={ticker}
                        onChange={(e) => setTicker(e.target.value.toUpperCase())}
                        placeholder="Ticker (e.g. SPY, AAPL)"
                        className="w-32 font-mono uppercase"
                    />
                    <Button type="submit" disabled={mutation.isPending}>
                        {mutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Search className="w-4 h-4 mr-2" />
                        )}
                        Fetch Chain
                    </Button>
                </form>
            </div>

            {/* Main Content */}
            <Card className="min-h-[600px] flex flex-col">
                <CardHeader>
                    <CardTitle>{data ? `${data.ticker} Volatility Surface` : "Analysis View"}</CardTitle>
                    <CardDescription>
                        {data
                            ? `Visualizing ${data.count} contracts across expirations.`
                            : "Enter a ticker and click Fetch to load the options chain."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 p-0 sm:p-6 overflow-hidden relative">
                    {mutation.isPending ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm z-10">
                            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                            <p className="text-lg font-medium">Fetching Options Chain...</p>
                            <p className="text-sm text-muted-foreground">This may take 5-10 seconds to process multiple expirations.</p>
                        </div>
                    ) : null}

                    {data ? (
                        <IVSurfaceChart data={data} />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-12 border-2 border-dashed rounded-lg m-4">
                            <Layers className="w-16 h-16 mb-4 opacity-20" />
                            <p className="text-lg font-medium">No Data Loaded</p>
                            <p>Fetch a ticker to view the 3D surface.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
