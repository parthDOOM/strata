/**
 * @file bindings.cpp
 * @brief PyBind11 bindings for the Monte Carlo simulation engine.
 *
 * Exposes the C++ Monte Carlo functionality to Python with automatic
 * type conversion between STL containers and Python lists/arrays.
 */

#include <pybind11/pybind11.h>
#include <pybind11/stl.h>  // Automatic STL <-> Python conversion

#include "monte_carlo.h"
#include "greeks_engine.h"

namespace py = pybind11;

PYBIND11_MODULE(monte_carlo_engine, m) {
    m.doc() = R"pbdoc(
        Monte Carlo Simulation Engine
        ------------------------------

        High-performance C++ engine for financial Monte Carlo simulations
        using Geometric Brownian Motion (GBM).

        Example:
            >>> from app.engine import monte_carlo_engine
            >>> result = monte_carlo_engine.run_monte_carlo(
            ...     s0=100.0,
            ...     mu=0.08,
            ...     sigma=0.2,
            ...     num_simulations=10000,
            ...     num_steps=252,
            ...     dt=1.0/252.0
            ... )
            >>> print(f"Expected final price: {result.final_price_mean:.2f}")
    )pbdoc";

    // Bind SimulationResult struct
    py::class_<quant::SimulationResult>(m, "SimulationResult",
        R"pbdoc(
            Aggregated results from Monte Carlo simulation.

            Attributes:
                mean_path: Average price path across all simulations
                percentile_05: 5th percentile path (95% CI lower bound)
                percentile_95: 95th percentile path (95% CI upper bound)
                histogram_data: Histogram counts of final prices
                histogram_edges: Bin edges for the histogram
                final_price_mean: Mean of final prices
                final_price_std: Standard deviation of final prices
                final_price_min: Minimum final price
                final_price_max: Maximum final price
        )pbdoc")
        .def(py::init<>())
        .def_readwrite("mean_path", &quant::SimulationResult::mean_path)
        .def_readwrite("percentile_05", &quant::SimulationResult::percentile_05)
        .def_readwrite("percentile_95", &quant::SimulationResult::percentile_95)
        .def_readwrite("histogram_data", &quant::SimulationResult::histogram_data)
        .def_readwrite("histogram_edges", &quant::SimulationResult::histogram_edges)
        .def_readwrite("final_price_mean", &quant::SimulationResult::final_price_mean)
        .def_readwrite("final_price_std", &quant::SimulationResult::final_price_std)
        .def_readwrite("final_price_min", &quant::SimulationResult::final_price_min)
        .def_readwrite("final_price_max", &quant::SimulationResult::final_price_max)
        .def_readwrite("final_prices", &quant::SimulationResult::final_prices)
        .def_readwrite("final_percentile_05", &quant::SimulationResult::final_percentile_05)
        .def_readwrite("final_percentile_01", &quant::SimulationResult::final_percentile_01)
        .def("__repr__", [](const quant::SimulationResult& r) {
            return "<SimulationResult mean_final=" + std::to_string(r.final_price_mean) +
                   " std=" + std::to_string(r.final_price_std) + ">";
        });

    // Bind run_monte_carlo function with keyword arguments
    m.def("run_monte_carlo", &quant::run_monte_carlo,
        R"pbdoc(
            Run Monte Carlo simulation using Geometric Brownian Motion.

            Simulates price paths using the GBM model:
                S(t+dt) = S(t) * exp((mu - 0.5*sigma^2)*dt + sigma*sqrt(dt)*Z)

            Args:
                s0: Initial price (spot price)
                mu: Annualized drift (expected return)
                sigma: Annualized volatility
                num_simulations: Number of simulation paths
                num_steps: Number of time steps per path
                dt: Time increment (e.g., 1.0/252.0 for daily)
                histogram_bins: Number of histogram bins (default: 50)
                seed: Random seed, 0 for random (default: 0)

            Returns:
                SimulationResult with aggregated statistics

            Example:
                >>> result = run_monte_carlo(
                ...     s0=100.0,
                ...     mu=0.08,
                ...     sigma=0.2,
                ...     num_simulations=10000,
                ...     num_steps=252,
                ...     dt=1.0/252.0
                ... )
        )pbdoc",
        py::arg("s0"),
        py::arg("mu"),
        py::arg("sigma"),
        py::arg("num_simulations"),
        py::arg("num_steps"),
        py::arg("dt"),
        py::arg("histogram_bins") = 50,
        py::arg("seed") = 0
    );

    // Bind GreeksResult struct
    py::class_<quant::GreeksResult>(m, "GreeksResult",
        R"pbdoc(
            Calculated Black-Scholes Greeks.

            Attributes:
                delta: Sensitivity to price change
                gamma: Sensitivity to delta change
                vega: Sensitivity to volatility change (per 1% vol)
                theta: Time decay (per 1 day)
                rho: Sensitivity to interest rate (per 1% rate)
        )pbdoc")
        .def(py::init<>())
        .def_readwrite("delta", &quant::GreeksResult::delta)
        .def_readwrite("gamma", &quant::GreeksResult::gamma)
        .def_readwrite("vega", &quant::GreeksResult::vega)
        .def_readwrite("theta", &quant::GreeksResult::theta)
        .def_readwrite("rho", &quant::GreeksResult::rho)
        .def("__repr__", [](const quant::GreeksResult& g) {
            return "<GreeksResult delta=" + std::to_string(g.delta) +
                   " gamma=" + std::to_string(g.gamma) + ">";
        });

    // Bind calculate_greeks function
    m.def("calculate_greeks", &quant::calculate_greeks,
        R"pbdoc(
            Calculate Option Greeks using Black-Scholes.

            Args:
                strike: Strike price
                time_to_expiry: Time to expiry in years
                spot: Current spot price
                risk_free_rate: Risk-free interest rate (e.g. 0.05 for 5%)
                volatility: Implied volatility (e.g. 0.20 for 20%)
                is_call: True for Call, False for Put (default: True)
        )pbdoc",
        py::arg("strike"),
        py::arg("time_to_expiry"),
        py::arg("spot"),
        py::arg("risk_free_rate"),
        py::arg("volatility"),
        py::arg("is_call") = true
    );

    // Version info
    m.attr("__version__") = "0.2.0";
}
