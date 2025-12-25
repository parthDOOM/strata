/**
 * Main application component with routing.
 *
 * Wraps routes in DashboardLayout with global notifications.
 */

import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { DashboardLayout } from "@/components/layout";
import { Dashboard, MonteCarlo, DataManager, StatArbPage, OptionsAnalysis, PortfolioOptimization, MarketDataPage, BacktestPage, SettingsPage, NewsPage, PortfolioDashboard } from "./pages";

import { PortfolioProvider } from "@/context/PortfolioContext";

export default function App() {
    return (
        <PortfolioProvider>
            <DashboardLayout>
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/monte-carlo" element={<MonteCarlo />} />
                    <Route path="/market" element={<MarketDataPage />} />
                    <Route path="/database" element={<DataManager />} />
                    <Route path="/strategies" element={<StatArbPage />} />
                    <Route path="/options" element={<OptionsAnalysis />} />
                    <Route path="/portfolio" element={<PortfolioOptimization />} />
                    <Route path="/portfolio/my-view" element={<PortfolioDashboard />} />
                    <Route path="/backtest/pairs" element={<BacktestPage />} />
                    <Route path="/news" element={<NewsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                </Routes>
            </DashboardLayout>
            <Toaster richColors position="top-right" />
        </PortfolioProvider>
    );
}
