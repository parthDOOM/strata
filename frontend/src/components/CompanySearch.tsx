import * as React from "react"
import { Search } from "lucide-react"

import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

interface SearchResult {
    symbol: string;
    name: string;
    exchange: string;
    sector: string;
    type: string;
}

interface CompanySearchProps {
    onSelect: (result: SearchResult) => void;
}

export function CompanySearch({ onSelect }: CompanySearchProps) {
    const [open, setOpen] = React.useState(false)
    const [value, setValue] = React.useState("")
    const [searchTerm, setSearchTerm] = React.useState("")
    const inputRef = React.useRef<HTMLInputElement>(null)

    // Debounce search term to avoid hitting API on every keystroke
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setSearchTerm(value)
        }, 500)
        return () => clearTimeout(timer)
    }, [value])

    const { data: results, isLoading } = useQuery({
        queryKey: ["companySearch", searchTerm],
        queryFn: async () => {
            if (!searchTerm || searchTerm.length < 2) return [];
            const res = await api.get<SearchResult[]>("/market/search", { params: { q: searchTerm } });
            return res.data;
        },
        enabled: searchTerm.length >= 2,
    })

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

    const handleSelect = (result: SearchResult) => {
        setValue(`${result.symbol} - ${result.name}`)
        onSelect(result)
        setOpen(false)
    }

    return (
        <div className="relative w-full">
            <Command className="rounded-lg border shadow-md overflow-visible relative z-50">
                <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <input
                        ref={inputRef}
                        className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Search company (e.g. Nvidia)..."
                        onChange={(e) => {
                            setValue(e.target.value)
                            setOpen(true)
                        }}
                        onFocus={() => setOpen(true)}
                        value={value}
                    />
                </div>

                {open && (searchTerm.length >= 2) && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-md z-50 animate-in fade-in-0 zoom-in-95">
                        <CommandList>
                            <CommandEmpty>
                                {isLoading ? "Searching..." : "No results found."}
                            </CommandEmpty>
                            <CommandGroup heading="Suggestions">
                                {results?.map((result) => (
                                    <CommandItem
                                        key={result.symbol}
                                        value={`${result.symbol} ${result.name}`} // Value for filtering
                                        onSelect={() => handleSelect(result)}
                                        className="cursor-pointer"
                                    >
                                        <div className="flex flex-col w-full">
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold">{result.symbol}</span>
                                                <span className="text-xs text-muted-foreground">{result.exchange}</span>
                                            </div>
                                            <span className="text-xs text-muted-foreground truncate">{result.name}</span>
                                        </div>
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
