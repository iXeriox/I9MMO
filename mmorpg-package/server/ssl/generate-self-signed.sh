#!/usr/bin/env bash
# Generates a self-signed cert for local/dev HTTPS testing.
# For production, drop real certs (fullchain.pem / privkey.pem) from
# Let's Encrypt / your CA into this same folder instead.
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout "$DIR/privkey.pem" \
  -out "$DIR/fullchain.pem" \
  -days 365 \
  -subj "/C=US/ST=Dev/L=Dev/O=MMORPG/CN=localhost"
echo "Generated $DIR/privkey.pem and $DIR/fullchain.pem"
