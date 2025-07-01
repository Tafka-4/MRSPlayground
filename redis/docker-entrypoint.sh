#!/bin/sh

# Redis Docker Entrypoint Script
# This script configures Redis with password from environment variable

set -e

# Copy base configuration
cp /usr/local/etc/redis/redis.conf /tmp/redis.conf

# Set password if REDIS_PASSWORD is provided
if [ -n "$REDIS_PASSWORD" ]; then
    echo "" >> /tmp/redis.conf
    echo "requirepass $REDIS_PASSWORD" >> /tmp/redis.conf
    echo "Redis password protection enabled"
else
    echo "Redis running without password protection"
fi

# Start Redis with our configuration
exec redis-server /tmp/redis.conf 