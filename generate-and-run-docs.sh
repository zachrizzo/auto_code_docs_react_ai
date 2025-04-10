#!/bin/bash

# Default values
USE_OLLAMA=false
OLLAMA_URL="http://localhost:11434"
OLLAMA_MODEL="nomic-embed-text:latest"
SIMILARITY_THRESHOLD=0.6
PORT=3000
ENABLE_CHAT=true
CHAT_MODEL="gemma3:27b"

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
    *) echo "Unknown parameter: $1"; exit 1 ;;
  esac
done

# Export environment variables for Node.js code
export OLLAMA_URL="$OLLAMA_URL"
export OLLAMA_MODEL="$OLLAMA_MODEL"
export SIMILARITY_THRESHOLD="$SIMILARITY_THRESHOLD"
export PORT="$PORT"
export ENABLE_CHAT="$ENABLE_CHAT"
export CHAT_MODEL="$CHAT_MODEL"

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
# Manually run the steps since there appears to be an issue with CLI arguments
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
    similarityThreshold: ${SIMILARITY_THRESHOLD}
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
  const outputPath = await generateDocUI(components, {
    title: 'React Component Documentation',
    description: 'Auto-generated documentation for React components',
    theme: 'light',
    outputDir: path.join(process.cwd(), 'docs')
  });

  console.log('✓ Documentation generated at ' + outputPath);
}

run().catch(console.error);
"

# 3. Start the server with chat functionality
node -e "
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

async function startServer() {
  const components = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'docs-components.json')));
  const { CodebaseChatService } = require('./dist/ai/chat-service');
  const outputPath = path.join(process.cwd(), 'docs');

  // Create a chat service
  const chatService = new CodebaseChatService(components, {
    useOllama: ${USE_OLLAMA},
    ollamaUrl: '${OLLAMA_URL}',
    ollamaModel: '${OLLAMA_MODEL}',
    chatModel: '${CHAT_MODEL}'
  });

  const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url || '', true);
    const pathname = parsedUrl.pathname || '';

    // Handle API requests
    if (pathname === '/api/chat' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          const { history, query } = JSON.parse(body);
          const result = await chatService.chat(history, query);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (error) {
          console.error('Error handling chat request:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      });

      return;
    }

    // Handle static file requests
    const filePath = path.join(outputPath, pathname === '/' ? 'index.html' : pathname);

    fs.readFile(filePath, (err, data) => {
      if (err) {
        // If file doesn't exist, serve index.html (for SPA routing)
        if (err.code === 'ENOENT' && !pathname.includes('.')) {
          fs.readFile(path.join(outputPath, 'index.html'), (err, data) => {
            if (err) {
              res.writeHead(404);
              res.end('Not Found');
              return;
            }

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
          });
          return;
        }

        res.writeHead(404);
        res.end('Not Found');
        return;
      }

      // Set content type based on file extension
      const ext = path.extname(filePath).toLowerCase();
      const contentType = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
      }[ext] || 'text/plain';

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });

  server.listen(${PORT});
  console.log('🚀 Server started at http://localhost:${PORT}');

  // Print URL for user to open manually instead of using 'open'
  console.log('✓ Documentation is now available at: http://localhost:${PORT}');
  console.log('Please open your browser to the URL above');
  console.log('Press Ctrl+C to stop the server');
}

startServer().catch(console.error);
"

# Save the URL to a file so the user can open it
echo "http://localhost:$PORT" > docs-url.txt
echo "📊 Documentation is available at: http://localhost:$PORT"
echo "The URL has been saved to docs-url.txt"

# Open the browser manually if xdg-open or open is available
if command -v xdg-open &> /dev/null; then
  xdg-open "http://localhost:$PORT"
elif command -v open &> /dev/null; then
  open "http://localhost:$PORT"
else
  echo "Could not automatically open browser. Please open the URL manually."
fi

# Wait for the user to press Ctrl+C
wait
