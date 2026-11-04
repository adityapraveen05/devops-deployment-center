
FROM python:3.12-slim

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY app.py .
COPY templates/ ./templates/
COPY static/ ./static/

# Application configuration
ENV APP_VERSION=1.0
ENV APP_ENV=Docker

# Expose Flask port
EXPOSE 5000

# Start Flask application
CMD ["python", "app.py"]
