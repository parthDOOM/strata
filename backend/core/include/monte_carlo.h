/**
 * @file monte_carlo.h
 * @brief High-performance Monte Carlo simulation engine for financial modeling.
 *
 * Implements Geometric Brownian Motion (GBM) for price path simulation
 * with efficient aggregation of results (mean, percentiles, histogram).
 */

#ifndef MONTE_CARLO_H
#define MONTE_CARLO_H

#include <vector>
#include <cstdint>

namespace quant {

/**
 * @brief Aggregated results from Monte Carlo simulation.
 *
 * Instead of returning all simulated paths (which can be massive),
 * we return summary statistics that are useful for visualization
 * and risk analysis.
 */
struct SimulationResult {
    /// Average price path across all simulations (length = num_steps + 1)
    std::vector<double> mean_path;

    /// 5th percentile path - 95% confidence interval lower bound
    std::vector<double> percentile_05;

    /// 95th percentile path - 95% confidence interval upper bound
    std::vector<double> percentile_95;

    /// Histogram of final prices (length = histogram_bins)
    std::vector<int> histogram_data;

    /// Histogram bin edges (length = histogram_bins + 1)
    std::vector<double> histogram_edges;

    /// Summary statistics for final prices
    double final_price_mean;
    double final_price_std;
    double final_price_min;
    double final_price_max;

    /// Tail Risk Metrics
    std::vector<double> final_prices; // Expose full distribution for CVaR calc
    double final_percentile_05;       // For 95% VaR
    double final_percentile_01;       // For 99% VaR
};

/**
 * @brief Run Monte Carlo simulation using Geometric Brownian Motion.
 *
 * Simulates price paths using the GBM model:
 *   S(t+dt) = S(t) * exp((mu - 0.5*sigma^2)*dt + sigma*sqrt(dt)*Z)
 *
 * Where Z ~ N(0,1) is a standard normal random variable.
 *
 * @param s0              Initial price (spot price)
 * @param mu              Annualized drift (expected return)
 * @param sigma           Annualized volatility (standard deviation of returns)
 * @param num_simulations Number of simulation paths to generate
 * @param num_steps       Number of time steps per path
 * @param dt              Time increment per step (e.g., 1.0/252.0 for daily)
 * @param histogram_bins  Number of bins for final price histogram
 * @param seed            Random seed for reproducibility (0 = random seed)
 *
 * @return SimulationResult containing aggregated statistics
 *
 * @note Uses std::mt19937_64 for high-quality random number generation.
 * @note All time steps must use double precision to avoid zero-output bugs.
 */
SimulationResult run_monte_carlo(
    double s0,
    double mu,
    double sigma,
    int num_simulations,
    int num_steps,
    double dt,
    int histogram_bins = 50,
    uint64_t seed = 0
);

} // namespace quant

#endif // MONTE_CARLO_H
