import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { getTickers } from "@/services/market";
import { Ticker } from "@/services/market";

interface MultiTickerSelectProps {
    selected: string[];
    onChange: (selected: string[]) => void;
}

export function MultiTickerSelect({ selected, onChange }: MultiTickerSelectProps) {
    const [tickers, setTickers] = useState<Ticker[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchTickers = async () => {
            setLoading(true);
            try {
                const data = await getTickers();
                setTickers(data.tickers);
            } catch (error) {
                console.error("Failed to fetch tickers", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTickers();
    }, []);

    const toggleTicker = (symbol: string) => {
        if (selected.includes(symbol)) {
            onChange(selected.filter((s) => s !== symbol));
        } else {
            onChange([...selected, symbol]);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-4 h-[200px] border rounded-md">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (tickers.length === 0) {
        return (
            <div className="p-4 border rounded-md text-sm text-muted-foreground text-center">
                No tickers available. Add some in Database.
            </div>
        );
    }

    return (
        <div className="border rounded-md h-[300px] overflow-y-auto p-2 space-y-1">
            {tickers.map((ticker) => (
                <label
                    key={ticker.symbol}
                    className="flex items-center gap-3 p-2 rounded hover:bg-accent/50 cursor-pointer transition-colors"
                >
                    <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                        checked={selected.includes(ticker.symbol)}
                        onChange={() => toggleTicker(ticker.symbol)}
                    />
                    <div className="flex flex-col">
                        <span className="font-mono font-medium text-sm leading-none">{ticker.symbol}</span>
                        <span className="text-xs text-muted-foreground line-clamp-1">{ticker.name || "N/A"}</span>
                    </div>
                </label>
            ))}
        </div>
    );
}
