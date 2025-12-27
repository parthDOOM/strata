/**
 * @file greeks_engine.cpp
 * @brief Implementation of Black-Scholes Greeks calculations.
 */

#include "greeks_engine.h"
#include <cmath>
#include <algorithm>

namespace quant {

// Constants
constexpr double PI = 3.14159265358979323846;
constexpr double INV_SQRT_2PI = 0.3989422804014327; // 1 / sqrt(2 * pi)

/**
 * @brief Standard Normal Probability Density Function (PDF)
 */
inline double normal_pdf(double x) {
    return INV_SQRT_2PI * std::exp(-0.5 * x * x);
}

/**
 * @brief Standard Normal Cumulative Distribution Function (CDF)
 */
inline double normal_cdf(double x) {
    return 0.5 * std::erfc(-x * 0.7071067811865475); // -x / sqrt(2)
}

GreeksResult calculate_greeks(
    double strike,
    double time_to_expiry,
    double spot,
    double risk_free_rate,
    double volatility,
    bool is_call
) {
    GreeksResult result = {0.0, 0.0, 0.0, 0.0, 0.0};

    // Edge cases
    if (time_to_expiry <= 0.0 || volatility <= 0.0 || strike <= 0.0 || spot <= 0.0) {
        // At expiry
        if (is_call) {
            result.delta = (spot > strike) ? 1.0 : 0.0;
        } else {
            result.delta = (spot < strike) ? -1.0 : 0.0;
        }
        return result;
    }

    double sqrt_t = std::sqrt(time_to_expiry);
    double d1 = (std::log(spot / strike) + (risk_free_rate + 0.5 * volatility * volatility) * time_to_expiry) / (volatility * sqrt_t);
    double d2 = d1 - volatility * sqrt_t;

    double nd1 = normal_cdf(d1);
    double nd2 = normal_cdf(d2);
    double n_prime_d1 = normal_pdf(d1);

    // Common term: e^(-rT)
    double exp_rt = std::exp(-risk_free_rate * time_to_expiry);

    // GAMMA (Same for Call and Put)
    result.gamma = n_prime_d1 / (spot * volatility * sqrt_t);

    // VEGA (Same for Call and Put)
    // Scaled by 0.01 to represent change per 1% shift in Vol
    result.vega = spot * n_prime_d1 * sqrt_t * 0.01;

    if (is_call) {
        // DELTA
        result.delta = nd1;

        // THETA
        // One day decay (scaled by 1/365)
        double term1 = -(spot * n_prime_d1 * volatility) / (2.0 * sqrt_t);
        double term2 = -risk_free_rate * strike * exp_rt * nd2;
        result.theta = (term1 + term2) / 365.0;

        // RHO
        // Scaled by 0.01 to represent change per 1% shift in Rate
        result.rho = strike * time_to_expiry * exp_rt * nd2 * 0.01;
    } else {
        // Put-Call Parity relations or direct Put formulas
        
        // DELTA
        result.delta = nd1 - 1.0;

        // THETA
        double term1 = -(spot * n_prime_d1 * volatility) / (2.0 * sqrt_t);
        double term2 = risk_free_rate * strike * exp_rt * normal_cdf(-d2);
        result.theta = (term1 + term2) / 365.0;

        // RHO
        result.rho = -strike * time_to_expiry * exp_rt * normal_cdf(-d2) * 0.01;
    }

    return result;
}

} // namespace quant
