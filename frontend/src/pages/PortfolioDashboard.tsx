import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePortfolio } from "@/context/PortfolioContext";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, TrendingUp, DollarSign, Database, Plus, Trash2 } from "lucide-react";
import ReactPlotly from "react-plotly.js";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CompanySearch } from "@/components/CompanySearch";

interface PortfolioPerformance {
    portfolio_id: number;
    total_value: number;
    daily_return_pct: number;
    equity_curve: { date: string; value: number }[];
    holdings: {
        symbol: string;
        quantity: number;
        avg_price: number;
        current_price: number;
        market_value: number;
        gain_loss: number;
    }[];
}

export default function PortfolioDashboard() {
    const { activePortfolioId, activePortfolio, refreshPortfolios, setActivePortfolioId } = usePortfolio();
    const queryClient = useQueryClient();
    const [isAddOpen, setIsAddOpen] = useState(false);

    // Add Stock State
    const [selectedCompany, setSelectedCompany] = useState<{ symbol: string, name: string } | null>(null);
    const [newQuantity, setNewQuantity] = useState("1");
    const [newPrice, setNewPrice] = useState("");

    const { data, isLoading, error } = useQuery({
        queryKey: ["portfolio", activePortfolioId, "performance"],
        queryFn: async () => {
            if (!activePortfolioId) return null;
            const response = await api.get<PortfolioPerformance>(`/portfolio/${activePortfolioId}/performance`);
            return response.data;
        },
        enabled: !!activePortfolioId,
        refetchInterval: 60000, // Refresh every minute
    });

    const addStockMutation = useMutation({
        mutationFn: async (vars: { symbol: string, quantity: number, average_price: number }) => {
            if (!activePortfolioId) return;
            await api.post(`/portfolio/${activePortfolioId}/items`, vars);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["portfolio", activePortfolioId, "performance"] });
            setIsAddOpen(false);
            setSelectedCompany(null);
            setNewQuantity("1");
            setNewPrice("");
        }
    });

    const deletePortfolioMutation = useMutation({
        mutationFn: async () => {
            if (!activePortfolioId) return;
            await api.delete(`/portfolio/${activePortfolioId}`);
            return activePortfolioId; // Return ID to use in onSuccess
        },
        onSuccess: (deletedId) => {
            if (deletedId) {
                queryClient.removeQueries({ queryKey: ["portfolio", deletedId] });
            }
            refreshPortfolios();
            setActivePortfolioId(null);
        }
    });

    const handleAddStock = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCompany || !newQuantity || !newPrice) return;
        addStockMutation.mutate({
            symbol: selectedCompany.symbol,
            quantity: parseFloat(newQuantity),
            average_price: parseFloat(newPrice)
        });
    };

    if (!activePortfolioId) {
        return (
            <div className="p-8 flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="bg-primary/10 p-4 rounded-full">
                    <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">No Portfolio Selected</h2>
                <p className="text-muted-foreground max-w-md">
                    Select a portfolio from the sidebar or create a new one to start tracking your assets.
                </p>
            </div>
        );
    }

    if (isLoading) {
        return <div className="p-8 space-y-4">
            <Skeleton className="h-8 w-64" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
            </div>
            <Skeleton className="h-[400px]" />
        </div>;
    }

    if (error) {
        return (
            <div className="p-8">
                <div className="bg-destructive/15 text-destructive p-4 rounded-lg flex items-center gap-3">
                    <AlertCircle className="h-4 w-4" />
                    <div>
                        <h4 className="font-medium">Error</h4>
                        <p className="text-sm">Failed to load portfolio performance.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{activePortfolio?.name}</h1>
                    <p className="text-muted-foreground">
                        Owner: {activePortfolio?.user_name || "Guest"}
                    </p>
                </div>
                <div className="flex gap-2">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Portfolio?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the
                                    "{activePortfolio?.name}" portfolio and all its holdings.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deletePortfolioMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Stock
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add Holding</DialogTitle>
                                <DialogDescription>Add a new stock position to this portfolio.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleAddStock}>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label>Company</Label>
                                        <CompanySearch onSelect={(res) => setSelectedCompany({ symbol: res.symbol, name: res.name })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="qty">Quantity</Label>
                                            <Input id="qty" type="number" step="any" value={newQuantity} onChange={e => setNewQuantity(e.target.value)} required />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="price">Avg Price</Label>
                                            <Input id="price" type="number" step="any" value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="150.00" required />
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={!selectedCompany || addStockMutation.isPending}>
                                        {addStockMutation.isPending ? "Adding..." : "Add Position"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${data.total_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Daily Return</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-2xl font-bold", data.daily_return_pct >= 0 ? "text-green-500" : "text-red-500")}>
                            {data.daily_return_pct >= 0 ? "+" : ""}{data.daily_return_pct.toFixed(2)}%
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Holdings Count</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.holdings.length}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Equity Curve */}
            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Equity Curve</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                    <ReactPlotly
                        data={[
                            {
                                x: data.equity_curve.map(d => d.date),
                                y: data.equity_curve.map(d => d.value),
                                type: 'scatter',
                                mode: 'lines',
                                name: 'Portfolio',
                                line: { color: '#8884d8', width: 2 },
                                fill: 'tozeroy',
                                fillcolor: 'rgba(136, 132, 216, 0.1)'
                            },
                        ]}
                        layout={{
                            autosize: true,
                            height: 350,
                            margin: { l: 40, r: 20, t: 10, b: 40 },
                            showlegend: false,
                            xaxis: { showgrid: false },
                            yaxis: { showgrid: true, gridcolor: "#333" },
                            paper_bgcolor: "rgba(0,0,0,0)",
                            plot_bgcolor: "rgba(0,0,0,0)",
                            font: { color: "#888" }
                        }}
                        useResizeHandler
                        style={{ width: "100%", height: "100%" }}
                        config={{ displayModeBar: false }}
                    />
                </CardContent>
            </Card>

            {/* Holdings Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Holdings</CardTitle>
                    <CardDescription>Current asset allocation and performance.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Symbol</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                                <TableHead className="text-right">Avg Price</TableHead>
                                <TableHead className="text-right">Current Price</TableHead>
                                <TableHead className="text-right">Market Value</TableHead>
                                <TableHead className="text-right">Gain/Loss</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.holdings.map((holding) => (
                                <TableRow key={holding.symbol}>
                                    <TableCell className="font-medium">{holding.symbol}</TableCell>
                                    <TableCell className="text-right">{holding.quantity}</TableCell>
                                    <TableCell className="text-right">${holding.avg_price.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">${holding.current_price.toFixed(2)}</TableCell>
                                    <TableCell className="text-right font-bold">${holding.market_value.toFixed(2)}</TableCell>
                                    <TableCell className={cn("text-right", holding.gain_loss >= 0 ? "text-green-500" : "text-red-500")}>
                                        ${holding.gain_loss.toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
