import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes with clsx.
 * Handles conditional classes and resolves conflicts.
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Format a number as currency (USD).
 */
export function formatCurrency(value: number): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}

/**
 * Format a number as a percentage.
 */
export function formatPercent(value: number, decimals = 2): string {
    return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

/**
 * Format large numbers with abbreviations (K, M, B).
 */
export function formatCompact(value: number): string {
    return new Intl.NumberFormat("en-US", {
        notation: "compact",
        compactDisplay: "short",
    }).format(value);
}
