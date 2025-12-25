import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Activity, Server, Database, Sun, Moon, TriangleAlert } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useTheme } from "@/components/theme-provider";

interface SystemHealth {
    ticker_count: number;
    price_rows: number;
    db_size_mb: number;
    status: string;
}

export default function SettingsPage() {
    const queryClient = useQueryClient();
    const [clearDialogOpen, setClearDialogOpen] = useState(false);
    const { setTheme } = useTheme();

    const healthQuery = useQuery({
        queryKey: ["system-health"],
        queryFn: async () => {
            const res = await api.get<SystemHealth>("/system/health");
            return res.data;
        }
    });

    const pruneMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post("/system/maintenance/prune");
            return res.data;
        },
        onSuccess: (data: any) => {
            toast.success(`Pruned ${data.deleted_count} empty tickers`);
            queryClient.invalidateQueries({ queryKey: ["system-health"] });
        },
        onError: () => toast.error("Prune failed")
    });

    const clearMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post("/system/maintenance/clear-all", { confirm: true });
            return res.data;
        },
        onSuccess: () => {
            toast.success("All market data cleared successfully");
            setClearDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: ["system-health"] });
        },
        onError: () => toast.error("Clear failed")
    });

    return (
        <div className="space-y-6 max-w-5xl mx-auto p-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
                <p className="text-muted-foreground">
                    Manage application health, storage, and preferences.
                </p>
            </div>

            {/* Section 1: Health Stats */}
            <h2 className="text-xl font-semibold flex items-center gap-2">
                <Activity className="h-5 w-5" />
                System Status
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Tickers
                        </CardTitle>
                        <Server className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {healthQuery.data?.ticker_count.toLocaleString() ?? "-"}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Active symbols
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Price Rows
                        </CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {healthQuery.data?.price_rows.toLocaleString() ?? "-"}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Historical data points
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Storage Size
                        </CardTitle>
                        <div className="h-4 w-4 text-muted-foreground font-mono">MB</div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {healthQuery.data?.db_size_mb.toFixed(2) ?? "-"} MB
                        </div>
                        <p className="text-xs text-muted-foreground">
                            SQLite database
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Section 2: Appearance */}
            <h2 className="text-xl font-semibold flex items-center gap-2 mt-8">
                <Sun className="h-5 w-5" />
                Appearance
            </h2>
            <Card>
                <CardHeader>
                    <CardTitle>Theme Preferences</CardTitle>
                    <CardDescription>
                        Toggle between light and dark modes.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-4">
                    <Button variant="outline" onClick={() => setTheme("light")}>
                        <Sun className="mr-2 h-4 w-4" /> Light
                    </Button>
                    <Button variant="outline" onClick={() => setTheme("dark")}>
                        <Moon className="mr-2 h-4 w-4" /> Dark
                    </Button>
                    <Button variant="outline" onClick={() => setTheme("system")}>
                        <Server className="mr-2 h-4 w-4" /> System
                    </Button>
                </CardContent>
            </Card>

            {/* Section 3: Maintenance */}
            <h2 className="text-xl font-semibold flex items-center gap-2 mt-8 text-destructive">
                <TriangleAlert className="h-5 w-5" />
                Danger Zone
            </h2>
            <Card className="border-destructive/50 bg-destructive/5">
                <CardHeader>
                    <CardTitle className="text-destructive">Database Maintenance</CardTitle>
                    <CardDescription>
                        Irreversible actions. Please proceed with caution.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-background">
                        <div>
                            <h3 className="font-medium">Prune Empty Tickers</h3>
                            <p className="text-sm text-muted-foreground">Remove tickers that have no price history.</p>
                        </div>
                        <Button
                            variant="secondary"
                            onClick={() => pruneMutation.mutate()}
                            disabled={pruneMutation.isPending}
                        >
                            {pruneMutation.isPending ? "Pruning..." : "Prune Now"}
                        </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-destructive/30 rounded-lg bg-background">
                        <div>
                            <h3 className="font-medium text-destructive">Clear All Data</h3>
                            <p className="text-sm text-muted-foreground">Delete ALL historical prices and Reset database.</p>
                        </div>

                        <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="destructive">Clear Database</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Are you absolutely sure?</DialogTitle>
                                    <DialogDescription>
                                        This action cannot be undone. This will permanently delete {healthQuery.data?.price_rows.toLocaleString() ?? "all"} price records from the database.
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setClearDialogOpen(false)}>Cancel</Button>
                                    <Button
                                        variant="destructive"
                                        onClick={() => clearMutation.mutate()}
                                        disabled={clearMutation.isPending}
                                    >
                                        {clearMutation.isPending ? "Deleting..." : "Yes, Delete Everything"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
