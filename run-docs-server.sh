#!/bin/bash

# Set default values
PORT=${PORT:-3000}
OLLAMA_URL=${OLLAMA_URL:-"http://localhost:11434"}
OLLAMA_MODEL=${OLLAMA_MODEL:-"nomic-embed-text:latest"}
SIMILARITY_THRESHOLD=${SIMILARITY_THRESHOLD:-0.6}
CHAT_MODEL=${CHAT_MODEL:-"gemma3:27b"}
ENABLE_CHAT=${ENABLE_CHAT:-true}
SHOW_CODE=${SHOW_CODE:-true}
SHOW_METHODS=${SHOW_METHODS:-true}
SHOW_SIMILARITY=${SHOW_SIMILARITY:-true}
USE_OLLAMA=${USE_OLLAMA:-true}

# Parse command-line arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --port) PORT="$2"; shift 2 ;;
    --ollama-url) OLLAMA_URL="$2"; shift 2 ;;
    --ollama-model) OLLAMA_MODEL="$2"; shift 2 ;;
    --similarity-threshold) SIMILARITY_THRESHOLD="$2"; shift 2 ;;
    --chat-model) CHAT_MODEL="$2"; shift 2 ;;
    --enable-chat) ENABLE_CHAT="$2"; shift 2 ;;
    --show-code) SHOW_CODE="$2"; shift 2 ;;
    --show-methods) SHOW_METHODS="$2"; shift 2 ;;
    --show-similarity) SHOW_SIMILARITY="$2"; shift 2 ;;
    --use-ollama) USE_OLLAMA="$2"; shift 2 ;;
    *) echo "Unknown parameter: $1"; exit 1 ;;
  esac
done

# Check if Ollama is running when USE_OLLAMA is true
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

  # If chat is enabled and using Ollama, also check chat model
  if [ "$ENABLE_CHAT" = true ]; then
    echo "💬 Chat functionality enabled with model: $CHAT_MODEL"
    echo "🔍 Checking if $CHAT_MODEL is available for chat..."
    if ! ollama list | grep -q "$CHAT_MODEL"; then
      echo "❌ Chat model '$CHAT_MODEL' is not available."
      echo "   Please pull it first:"
      echo "   ollama pull $CHAT_MODEL"
      exit 1
    fi
  fi
fi

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

# Kill any existing processes on the specified port
echo "🔍 Checking if port $PORT is in use..."
if lsof -i:$PORT -t &> /dev/null; then
  echo "🧹 Cleaning up process using port $PORT..."
  lsof -i:$PORT -t | xargs kill -9 &> /dev/null || true
  sleep 1
fi

# Create a .env.local file for Next.js to use the port and other settings
cat > src/ui/.env.local << EOF
PORT=$PORT
NEXT_PUBLIC_ENABLE_CHAT=${ENABLE_CHAT}
NEXT_PUBLIC_USE_OLLAMA=${USE_OLLAMA}
NEXT_PUBLIC_OLLAMA_URL=${OLLAMA_URL}
NEXT_PUBLIC_OLLAMA_MODEL=${OLLAMA_MODEL}
NEXT_PUBLIC_CHAT_MODEL=${CHAT_MODEL}
NEXT_PUBLIC_SHOW_CODE=${SHOW_CODE}
NEXT_PUBLIC_SHOW_METHODS=${SHOW_METHODS}
NEXT_PUBLIC_SHOW_SIMILARITY=${SHOW_SIMILARITY}
EOF

# Create a URL file that points to the documentation
DOCS_URL="http://localhost:$PORT"
echo "$DOCS_URL" > docs-url.txt
echo "📝 Documentation URL: $DOCS_URL"

# Navigate to the Next.js directory and start the development server
cd src/ui
npx next dev -p $PORT

# This code won't execute until the server is terminated
cd ../..
echo "👋 Documentation server stopped"
