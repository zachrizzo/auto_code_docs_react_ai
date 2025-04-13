#!/bin/bash

# Default values
USE_OLLAMA=false
OLLAMA_URL="http://localhost:11434"
OLLAMA_MODEL="nomic-embed-text:latest"
SIMILARITY_THRESHOLD=0.6
PORT=3000
ENABLE_CHAT=true
CHAT_MODEL="gemma3:27b"
SHOW_CODE=true
SHOW_METHODS=true
SHOW_SIMILARITY=true
# Mock API key for demo purposes
OPENAI_API_KEY="sk-mock-api-key-for-demo-purposes-only"

# Parse command-line arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --use-ollama) USE_OLLAMA=true; shift ;;
    --ollama-url) OLLAMA_URL="$2"; shift 2 ;;
    --ollama-model) OLLAMA_MODEL="$2"; shift 2 ;;
    --similarity-threshold) SIMILARITY_THRESHOLD="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    --enable-chat) ENABLE_CHAT="$2"; shift 2 ;;
    --chat-model) CHAT_MODEL="$2"; shift 2 ;;
    --show-code) SHOW_CODE="$2"; shift 2 ;;
    --show-methods) SHOW_METHODS="$2"; shift 2 ;;
    --show-similarity) SHOW_SIMILARITY="$2"; shift 2 ;;
    --api-key) OPENAI_API_KEY="$2"; shift 2 ;;
    *) echo "Unknown parameter: $1"; exit 1 ;;
  esac
done

# Ensure these values are always true for our requirements
ENABLE_CHAT=true
SHOW_CODE=true
SHOW_METHODS=true

# Export environment variables for Node.js code
export OLLAMA_URL="$OLLAMA_URL"
export OLLAMA_MODEL="$OLLAMA_MODEL"
export SIMILARITY_THRESHOLD="$SIMILARITY_THRESHOLD"
export PORT="$PORT"
export ENABLE_CHAT="$ENABLE_CHAT"
export CHAT_MODEL="$CHAT_MODEL"
export SHOW_CODE="$SHOW_CODE"
export SHOW_METHODS="$SHOW_METHODS"
export SHOW_SIMILARITY="$SHOW_SIMILARITY"
export OPENAI_API_KEY="$OPENAI_API_KEY"

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
export PORT="$PORT"
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

# Kill any existing processes on the specified port
echo "🔍 Checking if port $PORT is in use..."
if lsof -i:$PORT -t &> /dev/null; then
  echo "🧹 Cleaning up process using port $PORT..."
  lsof -i:$PORT -t | xargs kill -9 &> /dev/null || true
  sleep 1
fi

# Generate documentation
echo "📚 Generating documentation..."
echo "🧩 Showing component code: $SHOW_CODE"
echo "🔧 Showing component methods: $SHOW_METHODS"
echo "🔄 Showing method similarities: $SHOW_SIMILARITY"
echo "💬 AI Chat enabled: $ENABLE_CHAT"

# 1. Parse the components
node -e "
const { parseComponents } = require('./dist/index');
const path = require('path');

async function run() {
  const components = await parseComponents({
    rootDir: process.cwd(),
    componentPath: 'examples/DocumentAll.tsx',
    useOllama: ${USE_OLLAMA},
    ollamaUrl: '${OLLAMA_URL}',
    ollamaModel: '${OLLAMA_MODEL}',
    similarityThreshold: ${SIMILARITY_THRESHOLD},
    apiKey: '${OPENAI_API_KEY}'
  });

  // Write components to a file so we can use them in the next step
  require('fs').writeFileSync(
    path.join(process.cwd(), 'docs-components.json'),
    JSON.stringify(components)
  );

  console.log('✓ Components parsed successfully: ' + components.length + ' components found');
}

run().catch(console.error);
"

# 2. Generate the documentation UI
node -e "
const { generateDocUI } = require('./dist/index');
const path = require('path');
const fs = require('fs');

async function run() {
  const components = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'docs-components.json')));

  // Make sure the destination directory exists
  const publicDocsDir = path.join(process.cwd(), 'src/ui/docs-ui/public/docs-data');
  fs.mkdirSync(publicDocsDir, { recursive: true });

  // Generate the docs data
  const outputPath = await generateDocUI(components, {
    title: 'React Component Documentation',
    description: 'Auto-generated documentation for React components',
    theme: 'light',
    outputDir: publicDocsDir,
    showCode: true,
    showMethods: true,
    showSimilarity: ${SHOW_SIMILARITY}
  });

  // Verify the files exist
  if (fs.existsSync(path.join(publicDocsDir, 'component-index.json'))) {
    console.log('✓ Component index file created successfully');
  } else {
    console.error('❌ Failed to create component index file');
  }

  // Log the number of component files created
  const componentFiles = fs.readdirSync(publicDocsDir).filter(f => f.endsWith('.json') && f !== 'component-index.json' && f !== 'config.json');
  console.log(`✓ Created ${componentFiles.length} component data files`);

  console.log('✓ Documentation generated at ' + outputPath);
}

run().catch(console.error);
"

# 3. Start the Next.js development server
echo "🚀 Starting Next.js documentation server on port $PORT..."

# Create a URL file that points to the documentation
DOCS_URL="http://localhost:$PORT"
echo "$DOCS_URL" > docs-url.txt
echo "📝 Documentation URL: $DOCS_URL"

# Create a .env.local file for Next.js to use the port and other settings
cat > src/ui/docs-ui/.env.local << EOF
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

# Navigate to the Next.js directory and start the development server
cd src/ui/docs-ui
npx next dev -p $PORT

# This code won't execute until the server is terminated
cd ../../..
echo "👋 Documentation server stopped"
