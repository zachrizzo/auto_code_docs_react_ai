#!/bin/bash

# Script to run the full documentation UI process
# This script:
# 1. Processes the generated docs data
# 2. Builds the Next.js app (or runs it in dev mode)
# 3. Starts the server

# Default paths
DEFAULT_DOCS_PATH="/Users/zachrizzo/recursive-react-docs-ai/docs"
DOCS_PATH=${DOCS_PATH:-$DEFAULT_DOCS_PATH}
USE_MOCK=${USE_MOCK:-"false"}

# Command line arguments
MODE="dev"  # Default to dev mode
if [ "$1" == "build" ]; then
  MODE="build"
elif [ "$1" == "mock" ]; then
  USE_MOCK="true"
  MODE="dev"
elif [ "$1" == "mock-build" ]; then
  USE_MOCK="true"
  MODE="build"
fi

# Print information
echo "========================================"
echo "Running Documentation UI"
echo "========================================"
echo "Docs Path: $DOCS_PATH"
echo "Mode: $MODE"
echo "Using Mock Data: $USE_MOCK"
echo "========================================"

# Create the public directory if it doesn't exist
mkdir -p public/docs-data

# If using mock data, skip processing docs data
if [ "$USE_MOCK" == "true" ]; then
  echo "Using mock data, skipping data processing..."
else
  # Process docs data
  echo "Processing documentation data..."
  DOCS_PATH=$DOCS_PATH node scripts/generate-data.js

  # Check if the docs data was processed successfully
  if [ $? -ne 0 ]; then
    echo "Error processing docs data."
    exit 1
  fi
fi

# Based on mode, either build or run dev server
if [ "$MODE" == "build" ]; then
  # Build for production
  echo "Building production app..."
  npm run build

  if [ $? -ne 0 ]; then
    echo "Error building the app."
    exit 1
  fi

  # Start the production server
  echo "Starting production server..."
  npm run start
else
  # Run in development mode
  echo "Starting development server..."
  npm run dev
fi
