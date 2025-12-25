/**
 * Data Management Page.
 *
 * Allows users to view, add, and sync market data tickers.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw, Database } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { TickerSearch } from "@/components/TickerSearch";
import { CompanySearch } from "@/components/CompanySearch";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import { getTickers, addTicker, syncTicker, type TickerCreate } from "@/services/market";
import { cn } from "@/lib/utils";

export default function DataManager() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

    // Queries
    const { data, isLoading, isError } = useQuery({
        queryKey: ["tickers"],
        queryFn: getTickers,
    });

    // Mutations
    const syncMutation = useMutation({
        mutationFn: syncTicker,
        onSuccess: (data, variables) => {
            toast.success(`Synced ${variables}`, {
                description: `${data.rows_added} new price records added.`,
            });
            queryClient.invalidateQueries({ queryKey: ["tickers"] });
        },
        onError: (error: Error, variables) => {
            toast.error(`Failed to sync ${variables}`, {
                description: error.message,
            });
        },
    });

    const addMutation = useMutation({
        mutationFn: addTicker,
        onSuccess: (newTicker) => {
            toast.success(`Added ${newTicker.symbol}`, {
                description: "Ticker added to database. Starting initial sync...",
            });
            setIsAddDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: ["tickers"] });
            // Trigger sync immediately after add
            syncMutation.mutate(newTicker.symbol);
        },
        onError: (error: Error) => {
            toast.error("Failed to add ticker", {
                description: error.message,
            });
        },
    });

    // Filter tickers
    const filteredTickers = data?.tickers.filter((t) =>
        t.symbol.includes(searchTerm.toUpperCase()) ||
        (t.name && t.name.toLowerCase().includes(searchTerm.toLowerCase()))
    ) || [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <Database className="w-7 h-7 text-primary" />
                        Data Management
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Manage market data sources and synchronize price history
                    </p>
                </div>
                <div className="flex gap-2">
                    <AddTickerDialog
                        open={isAddDialogOpen}
                        onOpenChange={setIsAddDialogOpen}
                        onSubmit={(data) => addMutation.mutate(data)}
                        isPending={addMutation.isPending}
                    />
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Managed Tickers</CardTitle>
                            <CardDescription>
                                {data?.count || 0} assets tracked in database
                            </CardDescription>
                        </div>
                        <div className="flex gap-2 items-center">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    if (filteredTickers.length > 10 && !confirm(`Are you sure you want to sync ${filteredTickers.length} tickers? This might take a while.`)) {
                                        return;
                                    }
                                    filteredTickers.forEach((t) => syncMutation.mutate(t.symbol));
                                }}
                                disabled={filteredTickers.length === 0 || syncMutation.isPending}
                            >
                                <RefreshCw className={cn("w-4 h-4 mr-2", syncMutation.isPending && "animate-spin")} />
                                Sync All ({filteredTickers.length})
                            </Button>
                            <div className="relative w-64">
                                <TickerSearch
                                    tickers={data?.tickers.map(t => ({ symbol: t.symbol, name: t.name || "" })) || []}
                                    onSelect={(val) => setSearchTerm(val)}
                                    placeholder="Search managed tickers..."
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="h-64 flex items-center justify-center text-muted-foreground">
                            Loading tickers...
                        </div>
                    ) : isError ? (
                        <div className="h-64 flex items-center justify-center text-destructive">
                            Failed to load tickers. Is the backend running?
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px]">Symbol</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Sector</TableHead>
                                    <TableHead className="w-[100px]">Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTickers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            No tickers found. Add one to get started.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredTickers.map((ticker) => (
                                        <TableRow key={ticker.symbol}>
                                            <TableCell className="font-mono font-medium">
                                                {ticker.symbol}
                                            </TableCell>
                                            <TableCell>{ticker.name || "-"}</TableCell>
                                            <TableCell>{ticker.sector || "-"}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={ticker.is_active ? "default" : "secondary"}
                                                    className={cn(
                                                        ticker.is_active && "bg-green-500/15 text-green-700 dark:text-green-400 hover:bg-green-500/25"
                                                    )}
                                                >
                                                    {ticker.is_active ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => syncMutation.mutate(ticker.symbol)}
                                                    disabled={syncMutation.isPending && syncMutation.variables === ticker.symbol}
                                                >
                                                    <RefreshCw
                                                        className={cn(
                                                            "w-4 h-4 mr-2",
                                                            syncMutation.isPending &&
                                                            syncMutation.variables === ticker.symbol &&
                                                            "animate-spin"
                                                        )}
                                                    />
                                                    Sync
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// ==============================================================================
// Add Ticker Dialog Component
// ==============================================================================

interface AddTickerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: TickerCreate) => void;
    isPending: boolean;
}

function AddTickerDialog({ open, onOpenChange, onSubmit, isPending }: AddTickerDialogProps) {
    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<TickerCreate>();

    const onFormSubmit = (data: TickerCreate) => {
        onSubmit(data);
        reset();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Ticker
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Ticker</DialogTitle>
                    <DialogDescription>
                        Search for a company to auto-fill details, or enter manually.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="company-search">Company Search</Label>
                            <CompanySearch
                                onSelect={(result) => {
                                    setValue("symbol", result.symbol);
                                    setValue("name", result.name);
                                    setValue("sector", result.sector);
                                }}
                            />
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                    Or Manual Entry
                                </span>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="symbol">Symbol</Label>
                            <Input
                                id="symbol"
                                placeholder="e.g. MSFT"
                                className="col-span-3 uppercase font-mono"
                                {...register("symbol", { required: true })}
                            />
                            {errors.symbol && <span className="text-xs text-destructive">Symbol is required</span>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="name">Company Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g. Microsoft Corporation"
                                className="col-span-3"
                                {...register("name")}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="sector">Sector</Label>
                            <Input
                                id="sector"
                                placeholder="e.g. Technology"
                                className="col-span-3"
                                {...register("sector")}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                            Add & Sync
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
