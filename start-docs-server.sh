#!/bin/bash

# Create docs directory structure
mkdir -p src/ui/public/docs-data

# Run our URL fix script
node fix-docs-url.js

# Make sure the docs is available in the public directory
if [ -f "src/ui/public/docs-data/component-index.json" ]; then
  echo "✅ Documentation files found in public directory"
else
  echo "❌ Documentation files not found in public directory"
  echo "Copying from any available source..."

  # Check if docs-data exists in src/ui/docs-ui/public/docs-data
  if [ -d "src/ui/docs-ui/public/docs-data" ]; then
    echo "Found docs in src/ui/docs-ui/public/docs-data, copying..."
    cp -r src/ui/docs-ui/public/docs-data/* src/ui/public/docs-data/
  fi

  # Check if we now have the files
  if [ -f "src/ui/public/docs-data/component-index.json" ]; then
    echo "✅ Documentation files copied successfully"
  else
    echo "❌ No documentation files found. Please run generate-and-run-docs.sh first"
    exit 1
  fi
fi

# Start the Next.js server
cd src/ui
npm run dev
