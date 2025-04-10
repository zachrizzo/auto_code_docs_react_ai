#!/bin/bash

echo "📚 Generating documentation..."
# We now use the DocumentAll.tsx file directly
node dist/cli/index.js -c examples/DocumentAll.tsx -o docs \
  --use-ollama \
  --ollama-url "http://localhost:11434" \
  --ollama-model "nomic-embed-text:latest" \
  --similarity-threshold "0.6"

echo "✅ Documentation generated at docs"
