import * as React from "react"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"

export interface TickerOption {
    symbol: string;
    name: string;
}

interface TickerSearchProps {
    tickers: TickerOption[];
    onSelect: (ticker: string) => void;
    placeholder?: string;
}

export function TickerSearch({ tickers, onSelect, placeholder = "Search ticker..." }: TickerSearchProps) {
    const [open, setOpen] = React.useState(false)
    const [value, setValue] = React.useState("")
    const inputRef = React.useRef<HTMLInputElement>(null)

    // Close dropdown on click outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (inputRef.current && !inputRef.current.contains(event.target as Node) &&
                !(event.target as Element).closest('[cmdk-root]')) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleSelect = (currentValue: string) => {
        setValue(currentValue)
        onSelect(currentValue)
        setOpen(false)
    }

    return (
        <div className="relative w-full sm:w-64">
            <Command className="rounded-lg border shadow-md overflow-visible relative z-50">
                <CommandInput
                    ref={inputRef}
                    placeholder={placeholder}
                    onFocus={() => setOpen(true)}
                    onValueChange={(val) => {
                        setValue(val)
                        if (val) setOpen(true)
                    }}
                    value={value}
                    className="border-none focus:ring-0"
                />

                {open && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-md z-50 animate-in fade-in-0 zoom-in-95">
                        <CommandList>
                            <CommandEmpty>No results found.</CommandEmpty>
                            <CommandGroup heading="Suggestions">
                                {tickers.slice(0, 50).map((ticker) => (
                                    <CommandItem
                                        key={ticker.symbol}
                                        value={ticker.symbol} // This is used for filtering
                                        onSelect={handleSelect}
                                        className="cursor-pointer"
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-bold">{ticker.symbol}</span>
                                            <span className="text-xs text-muted-foreground">{ticker.name}</span>
                                        </div>
                                        {value === ticker.symbol && (
                                            <Check className={cn("ml-auto h-4 w-4")} />
                                        )}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </div>
                )}
            </Command>
        </div>
    )
}
