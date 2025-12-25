/**
 * @file monte_carlo.cpp
 * @brief Implementation of Monte Carlo simulation engine.
 */

#include "monte_carlo.h"

#include <algorithm>
#include <cmath>
#include <numeric>
#include <random>
#include <chrono>

namespace quant {

SimulationResult run_monte_carlo(
    double s0,
    double mu,
    double sigma,
    int num_simulations,
    int num_steps,
    double dt,
    int histogram_bins,
    uint64_t seed
) {
    // Initialize random number generator
    // Use provided seed or generate from high-resolution clock
    std::mt19937_64 rng;
    if (seed == 0) {
        auto now = std::chrono::high_resolution_clock::now();
        seed = static_cast<uint64_t>(now.time_since_epoch().count());
    }
    rng.seed(seed);

    // Standard normal distribution
    std::normal_distribution<double> normal(0.0, 1.0);

    // Pre-compute constants for GBM
    // S(t+dt) = S(t) * exp((mu - 0.5*sigma^2)*dt + sigma*sqrt(dt)*Z)
    const double drift = (mu - 0.5 * sigma * sigma) * dt;
    const double diffusion = sigma * std::sqrt(dt);

    // Storage for all simulated paths
    // paths[step][simulation] for cache-friendly access during aggregation
    std::vector<std::vector<double>> paths(num_steps + 1, std::vector<double>(num_simulations));

    // Initialize all paths with starting price
    std::fill(paths[0].begin(), paths[0].end(), s0);

    // Run simulations
    for (int sim = 0; sim < num_simulations; ++sim) {
        double price = s0;
        for (int step = 1; step <= num_steps; ++step) {
            double z = normal(rng);
            price *= std::exp(drift + diffusion * z);
            paths[step][sim] = price;
        }
    }

    // Prepare result structure
    SimulationResult result;
    result.mean_path.resize(num_steps + 1);
    result.percentile_05.resize(num_steps + 1);
    result.percentile_95.resize(num_steps + 1);

    // Calculate statistics at each time step
    for (int step = 0; step <= num_steps; ++step) {
        std::vector<double>& step_prices = paths[step];

        // Mean
        double sum = std::accumulate(step_prices.begin(), step_prices.end(), 0.0);
        result.mean_path[step] = sum / num_simulations;

        // Sort for percentile calculation
        std::sort(step_prices.begin(), step_prices.end());

        // 5th and 95th percentiles
        int idx_05 = static_cast<int>(0.05 * num_simulations);
        int idx_95 = static_cast<int>(0.95 * num_simulations);

        // Clamp indices to valid range
        idx_05 = std::max(0, std::min(idx_05, num_simulations - 1));
        idx_95 = std::max(0, std::min(idx_95, num_simulations - 1));

        result.percentile_05[step] = step_prices[idx_05];
        result.percentile_95[step] = step_prices[idx_95];
    }

    // Final price statistics
    const std::vector<double>& final_prices = paths[num_steps];

    result.final_price_min = final_prices.front();  // Already sorted
    result.final_price_max = final_prices.back();

    double sum = std::accumulate(final_prices.begin(), final_prices.end(), 0.0);
    result.final_price_mean = sum / num_simulations;

    // Standard deviation
    double sq_sum = 0.0;
    for (double price : final_prices) {
        double diff = price - result.final_price_mean;
        sq_sum += diff * diff;
    }
    result.final_price_std = std::sqrt(sq_sum / num_simulations);

    // Build histogram of final prices
    result.histogram_data.resize(histogram_bins, 0);
    result.histogram_edges.resize(histogram_bins + 1);

    // Add margin to histogram range
    double margin = (result.final_price_max - result.final_price_min) * 0.05;
    double hist_min = result.final_price_min - margin;
    double hist_max = result.final_price_max + margin;

    // Handle edge case where all final prices are the same
    if (hist_max <= hist_min) {
        hist_min = result.final_price_mean * 0.9;
        hist_max = result.final_price_mean * 1.1;
    }

    double bin_width = (hist_max - hist_min) / histogram_bins;

    // Compute bin edges
    for (int i = 0; i <= histogram_bins; ++i) {
        result.histogram_edges[i] = hist_min + i * bin_width;
    }

    // Count prices in each bin
    for (double price : final_prices) {
        int bin = static_cast<int>((price - hist_min) / bin_width);
        // Clamp to valid bin range
        bin = std::max(0, std::min(bin, histogram_bins - 1));
        result.histogram_data[bin]++;
    }

    return result;
}

} // namespace quant
