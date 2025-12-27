/**
 * Sidebar navigation component.
 *
 * Fixed left vertical menu with navigation links and icons.
 */

import { NavLink } from "react-router-dom";
import {
    LayoutDashboard,
    LineChart,
    Globe,
    Dice6,
    TrendingUp,
    Database,
    Settings,
    Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface NavItemProps {
    to: string;
    icon: React.ElementType;
    children: React.ReactNode;
}

function NavItem({ to, icon: Icon, children }: NavItemProps) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )
            }
        >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{children}</span>
        </NavLink>
    );
}

interface SidebarProps {
    className?: string;
}

import { Logo } from "@/components/Logo";

import { useState } from "react";
import { Plus } from "lucide-react";
import { usePortfolio } from "@/context/PortfolioContext";
import { api } from "@/lib/api";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Sidebar({ className }: SidebarProps) {
    const { portfolios, activePortfolioId, setActivePortfolioId, refreshPortfolios } = usePortfolio();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newPortfolioName, setNewPortfolioName] = useState("");
    const [newUserName, setNewUserName] = useState("Guest");
    const [isCreating, setIsCreating] = useState(false);

    const handleCreatePortfolio = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPortfolioName.trim()) return;

        setIsCreating(true);
        try {
            const response = await api.post<{ id: number; name: string }>("/portfolio/", {
                name: newPortfolioName,
                user_name: newUserName || "Guest",
            });
            await refreshPortfolios();
            setActivePortfolioId(response.data.id);
            setIsCreateOpen(false);
            setNewPortfolioName("");
            setNewUserName("Guest");
        } catch (error) {
            console.error("Failed to create portfolio", error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <aside
            className={cn(
                "w-64 border-r bg-card flex flex-col h-full",
                className
            )}
        >
            {/* Logo */}
            <div className="p-6">
                <NavLink to="/" className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Logo className="h-5 w-5" />
                    </div>
                    <span className="text-lg font-bold">Strata</span>
                </NavLink>
            </div>

            <Separator />

            {/* Portfolio Selector */}
            <div className="px-4 py-4">
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Active Portfolio
                    </label>
                    <Select
                        value={activePortfolioId?.toString() || "global"}
                        onValueChange={(val) => setActivePortfolioId(val === "global" ? null : parseInt(val))}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Portfolio" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="global">
                                <span className="font-medium">Global View</span>
                            </SelectItem>
                            {portfolios.map((p) => (
                                <SelectItem key={p.id} value={p.id.toString()}>
                                    {p.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full">
                                <Plus className="w-4 h-4 mr-2" />
                                New Portfolio
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create Portfolio</DialogTitle>
                                <DialogDescription>
                                    Create a new collection to track your assets.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreatePortfolio}>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">Portfolio Name</Label>
                                        <Input
                                            id="name"
                                            value={newPortfolioName}
                                            onChange={(e) => setNewPortfolioName(e.target.value)}
                                            placeholder="e.g. Tech Growth"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="username">User Name</Label>
                                        <Input
                                            id="username"
                                            value={newUserName}
                                            onChange={(e) => setNewUserName(e.target.value)}
                                            placeholder="e.g. John Doe"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={isCreating}>
                                        {isCreating ? "Creating..." : "Create Portfolio"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Separator />

            {/* Main Navigation */}
            <nav className="flex-1 p-4 space-y-1">
                <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Overview
                </p>
                <NavItem to="/" icon={LayoutDashboard}>
                    Dashboard
                </NavItem>
                {activePortfolioId && (
                    <NavItem to="/portfolio/my-view" icon={LineChart}>
                        My Portfolio
                    </NavItem>
                )}
                <NavItem to="/market" icon={LineChart}>
                    Market Analysis
                </NavItem>
                <NavItem to="/news" icon={Globe}>
                    Global News
                </NavItem>

                <p className="px-3 py-2 mt-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Analytics
                </p>
                <NavItem to="/monte-carlo" icon={Dice6}>
                    Monte Carlo
                </NavItem>
                <NavItem to="/strategies" icon={TrendingUp}>
                    Strategies
                </NavItem>
                <NavItem to="/options" icon={Activity}>
                    Options Analysis
                </NavItem>

                <p className="px-3 py-2 mt-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Data
                </p>
                <NavItem to="/database" icon={Database}>
                    Data Management
                </NavItem>
            </nav>

            <Separator />

            {/* Footer */}
            <div className="p-4">
                <NavItem to="/settings" icon={Settings}>
                    Settings
                </NavItem>
                <p className="px-3 py-2 mt-2 text-xs text-muted-foreground">
                    v0.1.0
                </p>
            </div>
        </aside>
    );
}

export default Sidebar;
