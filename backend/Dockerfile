# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies for C++ compilation
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    && rm -rf /var/lib/apt/lists/*

# Copy dependencies
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy C++ core source
COPY core/ ./core/

# Build C++ extension
# Assumes the output .so file needs to be in app/engine or PYTHONPATH
# Adjusting based on previous knowledge: The extension is heavily used in app/engine
RUN cd core && \
    mkdir build && \
    cd build && \
    cmake .. && \
    make && \
    # Move the compiled shared object to a location importable by the app
    # If the app expects it in app/engine/native or similar, we place it there.
    # For now, let's place it in /app/app/engine/ assuming the python code looks there
    # or ensure /app/core/build is in PYTHONPATH.
    # Looking at likely structure, usually we copy it to where the python wrapper is.
    mkdir -p /app/app/engine && \
    cp *.so /app/app/engine/

# Copy application code
COPY app/ ./app/
COPY scripts/ ./scripts/

# Create data directory
RUN mkdir -p /app/data

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
