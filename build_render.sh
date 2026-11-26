#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "===> Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "===> Checking Frontend Assets..."
if [ -d "frontend/dist" ] && [ -f "frontend/dist/index.html" ]; then
    echo "Pre-built frontend distribution verified."
fi

if command -v npm &> /dev/null; then
    echo "===> npm found: Rebuilding Frontend..."
    cd frontend
    npm install
    npm run build
    cd ..
else
    echo "===> npm not present: Serving pre-built frontend/dist via FastAPI."
fi

echo "===> Build completed successfully!"
