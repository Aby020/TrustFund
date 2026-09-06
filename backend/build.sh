#!/usr/bin/env bash
#
# Render build script for the TrustFund Django API.
# Render: Root Directory = backend, Build Command = ./build.sh,
#         Start Command = gunicorn config.wsgi:application
#
# Runs once per deploy inside Render's build image, with the service's
# environment variables (including DATABASE_URL) already present, so migrations
# land before the new workers accept traffic.
set -euo pipefail

echo ">> Installing Python dependencies"
python -m pip install --upgrade pip
pip install -r requirements.txt

echo ">> Collecting static files (WhiteNoise)"
python manage.py collectstatic --noinput

echo ">> Applying database migrations"
python manage.py migrate --noinput

echo ">> Build complete"