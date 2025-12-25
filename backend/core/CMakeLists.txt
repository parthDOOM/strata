cmake_minimum_required(VERSION 3.15)
project(monte_carlo_engine LANGUAGES CXX)

# ============================================================================
# C++ Standard Configuration
# ============================================================================
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Position Independent Code (required for shared libraries)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# ============================================================================
# Compiler Flags
# ============================================================================
if(MSVC)
    # Windows MSVC flags
    add_compile_options(/W4 /O2 /EHsc)
else()
    # GCC/Clang flags
    add_compile_options(-Wall -Wextra -O3 -ffast-math)
endif()

# ============================================================================
# Find pybind11
# ============================================================================
# Try to find pybind11 via pip installation first
execute_process(
    COMMAND "${Python_EXECUTABLE}" -c "import pybind11; print(pybind11.get_cmake_dir())"
    OUTPUT_VARIABLE PYBIND11_CMAKE_DIR
    OUTPUT_STRIP_TRAILING_WHITESPACE
    RESULT_VARIABLE PYBIND11_RESULT
)

if(PYBIND11_RESULT EQUAL 0)
    list(APPEND CMAKE_PREFIX_PATH "${PYBIND11_CMAKE_DIR}")
endif()

find_package(pybind11 CONFIG REQUIRED)

# ============================================================================
# Source Files
# ============================================================================
set(MONTE_CARLO_SOURCES
    src/monte_carlo.cpp
)

set(BINDING_SOURCES
    bindings/bindings.cpp
)

# ============================================================================
# Include Directories
# ============================================================================
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/include)

# ============================================================================
# Build Python Module
# ============================================================================
pybind11_add_module(monte_carlo_engine
    ${MONTE_CARLO_SOURCES}
    ${BINDING_SOURCES}
)

# Set module properties
set_target_properties(monte_carlo_engine PROPERTIES
    OUTPUT_NAME "monte_carlo_engine"
    PREFIX ""
)

# ============================================================================
# Installation (optional, for packaging)
# ============================================================================
install(TARGETS monte_carlo_engine
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
)
