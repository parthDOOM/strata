"use client"

import * as React from "react"
import {
    Settings,
    LayoutDashboard,
    Database,
    BarChart3,
    LineChart,
    Globe,
    Moon,
    Sun,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useTheme } from "next-themes"

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command"
import { getTickers } from "@/services/market"

export function CommandPalette() {
    const [open, setOpen] = React.useState(false)
    const navigate = useNavigate()
    const { setTheme } = useTheme()

    const { data: tickersData } = useQuery({
        queryKey: ["tickers"],
        queryFn: getTickers,
    });

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    const runCommand = React.useCallback((command: () => unknown) => {
        setOpen(false)
        command()
    }, [])

    return (
        <>
            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput placeholder="Type a command or search..." />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup heading="Suggestions">
                        <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            <span>Dashboard</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate("/market"))}>
                            <LineChart className="mr-2 h-4 w-4" />
                            <span>Market Analysis</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate("/database"))}>
                            <Database className="mr-2 h-4 w-4" />
                            <span>Data Manager</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate("/strategies"))}>
                            <BarChart3 className="mr-2 h-4 w-4" />
                            <span>Strategies</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate("/news"))}>
                            <Globe className="mr-2 h-4 w-4" />
                            <span>Global News</span>
                        </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="Market Data">
                        {tickersData?.tickers.slice(0, 10).map((ticker) => (
                            <CommandItem
                                key={ticker.symbol}
                                onSelect={() => runCommand(() => navigate(`/market?ticker=${ticker.symbol}`))}
                            >
                                <span className="font-mono font-bold mr-2">{ticker.symbol}</span>
                                <span className="text-muted-foreground text-xs">{ticker.name}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="Settings">
                        <CommandItem onSelect={() => runCommand(() => navigate("/settings"))}>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                            <CommandShortcut>⌘S</CommandShortcut>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
                            <Sun className="mr-2 h-4 w-4" />
                            <span>Light Mode</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
                            <Moon className="mr-2 h-4 w-4" />
                            <span>Dark Mode</span>
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    )
}
