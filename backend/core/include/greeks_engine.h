/**
 * @file greeks_engine.h
 * @brief Black-Scholes Greeks calculation engine.
 */

#ifndef GREEKS_ENGINE_H
#define GREEKS_ENGINE_H

#include <vector>

namespace quant {

/**
 * @brief Container for calculated Greeks.
 */
struct GreeksResult {
    double delta;
    double gamma;
    double vega;
    double theta;
    double rho;
};

/**
 * @brief Calculate Option Greeks using Black-Scholes model.
 *
 * @param strike          Option strike price (K)
 * @param time_to_expiry  Time to expiry in years (T)
 * @param spot            Current spot price (S)
 * @param risk_free_rate  Risk-free interest rate (r)
 * @param volatility      Implied volatility (sigma)
 * @param is_call         True for Call, False for Put
 * 
 * @return GreeksResult struct containing Delta, Gamma, Vega, Theta, Rho.
 */
GreeksResult calculate_greeks(
    double strike,
    double time_to_expiry,
    double spot,
    double risk_free_rate,
    double volatility,
    bool is_call = true
);

} // namespace quant

#endif // GREEKS_ENGINE_H
