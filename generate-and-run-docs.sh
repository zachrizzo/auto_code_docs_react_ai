#!/bin/bash

# Default values
USE_OLLAMA=false
OLLAMA_URL="http://localhost:11434"
OLLAMA_MODEL="nomic-embed-text:latest"
SIMILARITY_THRESHOLD=0.6
PORT=3000

# Parse command-line arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --use-ollama) USE_OLLAMA=true; shift ;;
    --ollama-url) OLLAMA_URL="$2"; shift 2 ;;
    --ollama-model) OLLAMA_MODEL="$2"; shift 2 ;;
    --similarity-threshold) SIMILARITY_THRESHOLD="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    *) echo "Unknown parameter: $1"; exit 1 ;;
  esac
done

# Find a free port starting from PORT
find_free_port() {
  local port=$PORT
  while lsof -i:$port >/dev/null 2>&1; do
    echo "Port $port is already in use, trying next port..." >&2
    ((port++))
  done
  echo "$port"
}

# Make sure we capture only the port number without any stderr messages
PORT=$(find_free_port)
echo "🔍 Using port $PORT for server"

# If using Ollama, check if it's running and model is available
if [ "$USE_OLLAMA" = true ]; then
  echo "🦙 Using Ollama for embeddings"
  echo "🔗 Ollama URL: $OLLAMA_URL"
  echo "🧠 Ollama model: $OLLAMA_MODEL"
  echo "🔢 Similarity threshold: $SIMILARITY_THRESHOLD"

  # Check if Ollama is running
  echo "🔍 Checking if Ollama is running..."
  if ! curl -s "$OLLAMA_URL/api/tags" > /dev/null; then
    echo "❌ Ollama doesn't seem to be running at $OLLAMA_URL"
    echo "   Please start Ollama first:"
    echo "   ollama serve"
    exit 1
  fi

  # Check if the model is available using ollama list
  echo "🔍 Checking if $OLLAMA_MODEL is available..."
  if ! ollama list | grep -q "$OLLAMA_MODEL"; then
    echo "❌ Model '$OLLAMA_MODEL' is not available."
    echo "   Please pull it first:"
    echo "   ollama pull $OLLAMA_MODEL"
    exit 1
  fi
fi

# Kill any existing processes on the specified port
echo "🔍 Checking if port $PORT is in use..."
if lsof -i:$PORT -t &> /dev/null; then
  echo "🧹 Cleaning up process using port $PORT..."
  lsof -i:$PORT -t | xargs kill -9 &> /dev/null || true
  sleep 1
fi

# Generate documentation
echo "📚 Generating documentation..."
if [ "$USE_OLLAMA" = true ]; then
  node dist/cli/index.js -c examples/DocumentAll.tsx -o docs \
    --use-ollama \
    --ollama-url "$OLLAMA_URL" \
    --ollama-model "$OLLAMA_MODEL" \
    --similarity-threshold "$SIMILARITY_THRESHOLD"
else
  node dist/cli/index.js -c examples/DocumentAll.tsx -o docs
fi

# Check if docs directory exists
if [ ! -d "docs" ]; then
  echo "❌ Error: docs directory was not created. Check for errors above."
  exit 1
fi

# Ensure the docs directory has the proper files
if [ ! -f "docs/index.html" ]; then
  echo "❌ Error: docs/index.html is missing. Documentation generation may have failed."
  exit 1
fi

# Start the HTTP server using npx http-server
echo "🚀 Starting HTTP server on port $PORT..."
cd docs
echo "📊 Documentation is available at: http://localhost:$PORT"
# Explicitly add the path, port, and options as separate arguments to avoid type conversion issues
npx http-server ./ -p "$PORT" --cors -c-1 -o
