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

export function Sidebar({ className }: SidebarProps) {
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

            {/* Main Navigation */}
            <nav className="flex-1 p-4 space-y-1">
                <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Overview
                </p>
                <NavItem to="/" icon={LayoutDashboard}>
                    Dashboard
                </NavItem>
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
