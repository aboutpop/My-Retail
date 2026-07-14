FROM php:8.2-cli

# ติดตั้ง MySQL และ PostgreSQL extensions
RUN apt-get update && apt-get install -y libpq-dev \
    && docker-php-ext-install mysqli pdo_mysql pdo_pgsql \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

ENTRYPOINT ["/bin/sh", "-c", "php -S 0.0.0.0:${PORT:-8080} -t ."]
