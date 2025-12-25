/**
 * Dashboard layout component.
 *
 * Provides the main application layout with sidebar, header, and content area.
 * Responsive: sidebar hidden on mobile, visible on desktop.
 */

import { useState } from "react";
import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ModeToggle } from "@/components/mode-toggle";
import { Sidebar } from "./Sidebar";
import { CommandPalette } from "../CommandPalette";
import { NotificationCenter } from "../NotificationCenter";

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-background flex">
            <CommandPalette />
            {/* Desktop Sidebar - hidden on mobile */}
            <Sidebar className="hidden lg:flex fixed left-0 top-0 bottom-0 z-30" />

            {/* Main Content Area */}
            <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
                {/* Top Header */}
                <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="flex h-14 items-center gap-4 px-4 lg:px-6">
                        {/* Mobile Menu Button */}
                        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                            <SheetTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="lg:hidden"
                                >
                                    <Menu className="h-5 w-5" />
                                    <span className="sr-only">Toggle menu</span>
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="p-0 w-64">
                                <Sidebar />
                            </SheetContent>
                        </Sheet>

                        <div className="flex-1 flex items-center gap-2 max-w-md">
                            <Button
                                variant="outline"
                                className="relative h-9 w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
                                onClick={() => {
                                    // Dispatch keyboard event to toggle Command Palette
                                    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
                                }}
                            >
                                <Search className="mr-2 h-4 w-4" />
                                <span className="hidden lg:inline-flex">Search...</span>
                                <span className="inline-flex lg:hidden">Search...</span>
                                <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                                    <span className="text-xs">⌘</span>K
                                </kbd>
                            </Button>
                        </div>

                        {/* Right side actions */}
                        <div className="flex items-center gap-2">
                            <NotificationCenter />
                            <Separator orientation="vertical" className="h-6" />
                            <ModeToggle />
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 lg:p-6">
                    {children}
                </main>

                {/* Footer */}
                <footer className="border-t py-4 px-6">
                    <div className="text-center text-sm text-muted-foreground">
                        Quant Platform v0.1.0 — Built with FastAPI + React
                    </div>
                </footer>
            </div>
        </div>
    );
}

export default DashboardLayout;
