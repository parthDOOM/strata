# Monte Carlo Engine Testing Guide

This guide explains how to build and test the C++ Monte Carlo simulation engine.

---

## Prerequisites

Before testing, ensure you have:

- ✅ **Python 3.10+** (already installed)
- ✅ **CMake 3.15+** - [Download](https://cmake.org/download/)
- ✅ **C++ Build Tools** - Visual Studio 2022 with "Desktop development with C++" workload

---

## Step 1: Build the Extension

Open a terminal in the backend directory and run:

```powershell
cd e:\Qua\quant-platform\backend
python scripts/build_extension.py
```

**Expected output:**
```
============================================================
Monte Carlo Engine Build Script
============================================================

📋 Checking dependencies...
✓ cmake version 3.28.0
✓ pybind11 2.11.1

📁 Core directory: e:\Qua\quant-platform\backend\core
📁 Build directory: e:\Qua\quant-platform\backend\core\build
📁 Target directory: e:\Qua\quant-platform\backend\app\engine

🔧 Configuring CMake...
🔨 Building extension...
✓ Found extension: ...\monte_carlo_engine.pyd
✓ Copied to: ...\backend\app\engine\monte_carlo_engine.pyd

🧪 Verifying extension...
✓ Module imported successfully
  Version: 0.1.0
  Test simulation: mean_final = $108.32
                   std = $21.45
✓ Extension verified successfully!

============================================================
✅ Build completed successfully!
============================================================
```

---

## Step 2: Quick Import Test

Test that the module can be imported:

```powershell
cd e:\Qua\quant-platform\backend
python -c "from app.engine import run_monte_carlo; print('✓ Import successful')"
```

---

## Step 3: Standalone Engine Test

Test the C++ engine directly (no database needed):

```python
# Save as: backend/test_engine.py
import sys
sys.path.insert(0, "app/engine")

from monte_carlo_engine import run_monte_carlo

# Run simulation: $100 stock, 8% drift, 20% volatility, 1 year
result = run_monte_carlo(
    s0=100.0,
    mu=0.08,
    sigma=0.20,
    num_simulations=10_000,
    num_steps=252,
    dt=1.0/252.0,
    histogram_bins=50,
    seed=42  # For reproducibility
)

print("=" * 50)
print("Monte Carlo Simulation Results")
print("=" * 50)
print(f"Starting Price:     ${100:.2f}")
print(f"Expected Final:     ${result.final_price_mean:.2f}")
print(f"Std Deviation:      ${result.final_price_std:.2f}")
print(f"95% CI:             [${result.percentile_05[-1]:.2f}, ${result.percentile_95[-1]:.2f}]")
print(f"Min Final Price:    ${result.final_price_min:.2f}")
print(f"Max Final Price:    ${result.final_price_max:.2f}")
print(f"Path Length:        {len(result.mean_path)} steps")
print(f"Histogram Bins:     {len(result.histogram_data)}")
```

Run with:
```powershell
cd e:\Qua\quant-platform\backend
python test_engine.py
```

---

## Step 4: Full Integration Test (With Database)

Test the complete simulation service with real data:

```python
# Save as: backend/test_simulation_service.py
from datetime import date
from sqlmodel import Session

from app.core.db import engine
from app.services import SimulationRequest, run_simulation, get_simulation_summary

# Test with AAPL (assuming data was seeded)
with Session(engine) as session:
    request = SimulationRequest(
        ticker="AAPL",
        start_date=date(2023, 1, 1),
        end_date=date(2024, 12, 1),
        num_simulations=10_000,
        num_steps=252,
    )
    
    try:
        # Get full summary
        summary = get_simulation_summary(session, request)
        
        print("=" * 50)
        print(f"Simulation for {summary['ticker']}")
        print("=" * 50)
        print(f"Data points used: {summary['parameters']['data_points_used']}")
        print(f"Annualized Drift (μ):      {summary['parameters']['mu']:.4f}")
        print(f"Annualized Volatility (σ): {summary['parameters']['sigma']:.4f}")
        print(f"Starting Price:            ${summary['parameters']['s0']:.2f}")
        print()
        print("Simulation Results:")
        print(f"  Expected Final Price: ${summary['results']['final_price']['mean']:.2f}")
        print(f"  Standard Deviation:   ${summary['results']['final_price']['std']:.2f}")
        
    except ValueError as e:
        print(f"❌ Validation Error: {e}")
    except ImportError as e:
        print(f"❌ Engine not built: {e}")
```

Run with:
```powershell
cd e:\Qua\quant-platform\backend
python test_simulation_service.py
```

---

## Troubleshooting

### "CMake not found"
- Install CMake and add to PATH
- Restart terminal after installation

### "No suitable compiler found"
- Install Visual Studio 2022 with "Desktop development with C++"
- Or install Build Tools for Visual Studio 2022

### "pybind11 not found"
```powershell
pip install pybind11
```

### "No price data found for TICKER"
- Run the seed script first:
```powershell
python scripts/seed_market_data.py
```

---

## Expected Test Results

With seed=42 and default parameters ($100 start, 8% drift, 20% vol):

| Metric | Expected Range |
|--------|----------------|
| Mean Final Price | $105 - $112 |
| Std Deviation | $18 - $25 |
| 5th Percentile | $70 - $85 |
| 95th Percentile | $140 - $160 |
