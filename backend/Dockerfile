FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    default-jre \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput

EXPOSE 8000

# CMD ["gunicorn", "--bind", "0.0.0.0:8000", "core.wsgi:application"]
# CMD ["gunicorn", "core.wsgi:application", "--bind", "0.0.0.0:8000", "--timeout", "120", "--workers", "2"]
# CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn core.wsgi:application --bind 0.0.0.0:8000"]


