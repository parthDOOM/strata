import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "@/lib/api";

interface Portfolio {
    id: number;
    name: string;
    description?: string;
    user_name?: string;
}

interface PortfolioContextType {
    activePortfolioId: number | null;
    setActivePortfolioId: (id: number | null) => void;
    activePortfolio: Portfolio | null;
    refreshPortfolios: () => Promise<void>;
    portfolios: Portfolio[];
    isLoading: boolean;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
    const [activePortfolioId, setActivePortfolioIdState] = useState<number | null>(() => {
        const stored = localStorage.getItem("activePortfolioId");
        return stored ? parseInt(stored) : null;
    });

    const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const setActivePortfolioId = (id: number | null) => {
        setActivePortfolioIdState(id);
        if (id) {
            localStorage.setItem("activePortfolioId", id.toString());
        } else {
            localStorage.removeItem("activePortfolioId");
        }
    };

    const fetchPortfolios = async () => {
        setIsLoading(true);
        try {
            const response = await api.get<Portfolio[]>("/portfolio/");
            setPortfolios(response.data);
        } catch (error) {
            console.error("Failed to fetch portfolios", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPortfolios();
    }, []);

    const activePortfolio = portfolios.find(p => p.id === activePortfolioId) || null;

    return (
        <PortfolioContext.Provider value={{
            activePortfolioId,
            setActivePortfolioId,
            activePortfolio,
            refreshPortfolios: fetchPortfolios,
            portfolios,
            isLoading
        }}>
            {children}
        </PortfolioContext.Provider>
    );
}

export function usePortfolio() {
    const context = useContext(PortfolioContext);
    if (context === undefined) {
        throw new Error("usePortfolio must be used within a PortfolioProvider");
    }
    return context;
}
