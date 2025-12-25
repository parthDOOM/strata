#!/usr/bin/env python3
"""
Build script for the Monte Carlo C++ extension.

This script automates the compilation of the C++ Monte Carlo engine
using CMake and places the resulting Python extension module into
the backend/app/engine/ directory.

Usage:
    python backend/scripts/build_extension.py

Requirements:
    - CMake >= 3.15
    - C++ compiler (MSVC on Windows, GCC/Clang on Linux/Mac)
    - pybind11 (installed via pip)
"""

import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path


def get_python_paths() -> dict[str, str]:
    """Get Python executable and include paths for CMake."""
    return {
        "Python_EXECUTABLE": sys.executable,
        "Python_INCLUDE_DIR": str(Path(sys.prefix) / "include"),
    }


def check_dependencies() -> None:
    """Check that all required dependencies are installed."""
    # Check CMake
    try:
        result = subprocess.run(
            ["cmake", "--version"],
            capture_output=True,
            text=True,
            check=True,
        )
        version_line = result.stdout.split("\n")[0]
        print(f"[OK] {version_line}")
    except FileNotFoundError:
        print("[ERROR] CMake not found. Please install CMake >= 3.15")
        sys.exit(1)

    # Check pybind11
    try:
        import pybind11

        print(f"[OK] pybind11 {pybind11.__version__}")
    except ImportError:
        print("[INFO] pybind11 not found. Installing...")
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "pybind11"],
            check=True,
        )
        print("[OK] pybind11 installed")


def get_extension_suffix() -> str:
    """Get the correct extension suffix for the current platform."""
    if platform.system() == "Windows":
        return ".pyd"
    else:
        # Linux/Mac use .so with version info
        import sysconfig

        return sysconfig.get_config_var("EXT_SUFFIX") or ".so"


def build_extension() -> Path:
    """
    Build the C++ extension using CMake.

    Returns:
        Path to the built extension module.
    """
    # Determine paths
    script_dir = Path(__file__).parent.resolve()
    backend_dir = script_dir.parent
    core_dir = backend_dir / "core"
    build_dir = core_dir / "build"
    engine_dir = backend_dir / "app" / "engine"

    print(f"\nCore directory: {core_dir}")
    print(f"Build directory: {build_dir}")
    print(f"Target directory: {engine_dir}")

    # Create directories
    build_dir.mkdir(exist_ok=True)
    engine_dir.mkdir(exist_ok=True)

    # CMake configuration
    python_paths = get_python_paths()
    cmake_args = [
        "cmake",
        str(core_dir),
        f"-DPython_EXECUTABLE={python_paths['Python_EXECUTABLE']}",
    ]

    # Platform-specific generator
    if platform.system() == "Windows":
        # Use Ninja for better compatibility across VS versions
        cmake_args.extend(["-G", "Ninja"])
    else:
        # Use default generator (usually Make or Ninja)
        pass

    print("\n[BUILD] Configuring CMake...")
    subprocess.run(cmake_args, cwd=build_dir, check=True)

    # Build
    print("\n[BUILD] Building extension...")
    build_args = ["cmake", "--build", ".", "--config", "Release"]
    subprocess.run(build_args, cwd=build_dir, check=True)

    # Find the built extension
    ext_suffix = get_extension_suffix()
    extension_name = f"monte_carlo_engine{ext_suffix}"

    # Search for the built file (location varies by generator)
    possible_locations = [
        build_dir / extension_name,
        build_dir / "Release" / extension_name,
        build_dir / "Debug" / extension_name,
    ]

    built_extension = None
    for loc in possible_locations:
        if loc.exists():
            built_extension = loc
            break

    if not built_extension:
        # Try glob search
        for ext_file in build_dir.rglob(f"monte_carlo_engine*{ext_suffix}"):
            built_extension = ext_file
            break

    if not built_extension:
        print(f"[ERROR] Could not find built extension in {build_dir}")
        print(f"  Looking for: {extension_name}")
        sys.exit(1)

    print(f"[OK] Found extension: {built_extension}")

    # Copy to engine directory
    target_path = engine_dir / extension_name
    shutil.copy2(built_extension, target_path)
    print(f"[OK] Copied to: {target_path}")

    return target_path


def verify_extension(extension_path: Path) -> None:
    """Verify that the extension can be imported."""
    print("\n[TEST] Verifying extension...")

    # Add engine directory to path
    engine_dir = extension_path.parent
    sys.path.insert(0, str(engine_dir))

    try:
        import monte_carlo_engine

        print(f"[OK] Module imported successfully")
        print(f"  Version: {monte_carlo_engine.__version__}")

        # Run a quick test
        result = monte_carlo_engine.run_monte_carlo(
            s0=100.0,
            mu=0.08,
            sigma=0.20,
            num_simulations=1000,
            num_steps=252,
            dt=1.0 / 252.0,
            histogram_bins=50,
            seed=42,
        )

        print(f"  Test simulation: mean_final = ${result.final_price_mean:.2f}")
        print(f"                   std = ${result.final_price_std:.2f}")
        print("[OK] Extension verified successfully!")

    except Exception as e:
        print(f"[ERROR] Verification failed: {e}")
        sys.exit(1)
    finally:
        sys.path.pop(0)


def main() -> None:
    """Main entry point."""
    print("=" * 60)
    print("Monte Carlo Engine Build Script")
    print("=" * 60)

    print("\n[CHECK] Checking dependencies...")
    check_dependencies()

    extension_path = build_extension()
    verify_extension(extension_path)

    print("\n" + "=" * 60)
    print("[SUCCESS] Build completed successfully!")
    print("=" * 60)
    print(f"\nTo use the extension:")
    print("    from app.engine import monte_carlo_engine")
    print("    result = monte_carlo_engine.run_monte_carlo(...)")


if __name__ == "__main__":
    main()
