FROM python:3.11-slim

WORKDIR /app

# LOW-4 FIX: Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

# Install hatch to build/install package
RUN pip install --no-cache-dir hatch

# Copy package files
COPY pyproject.toml README.md ./
COPY src ./src

# Install dependencies and the package itself
RUN pip install --no-cache-dir .

# Set correct permissions
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Default command (overridden in compose)
CMD ["python", "-m", "workers.clickhouse_writer"]
