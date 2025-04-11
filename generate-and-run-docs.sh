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
  const outputPath = await generateDocUI(components, {
    title: 'React Component Documentation',
    description: 'Auto-generated documentation for React components',
    theme: 'light',
    outputDir: path.join(process.cwd(), 'docs'),
    showCode: true,
    showMethods: true,
    showSimilarity: ${SHOW_SIMILARITY}
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
    chatModel: '${CHAT_MODEL}',
    apiKey: '${OPENAI_API_KEY}'
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

    // Handle component code API endpoint
    if (pathname === '/api/component-code' && req.method === 'GET') {
      try {
        const queryParams = parsedUrl.query;
        const componentName = queryParams.name;

        if (!componentName) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Component name is required' }));
          return;
        }

        // Find the component by name
        const component = components.find(c => c.name === componentName);

        if (!component) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Component not found' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          sourceCode: component.sourceCode,
          methods: component.methods,
          similarityWarnings: component.similarityWarnings
        }));
      } catch (error) {
        console.error('Error handling component code request:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
      return;
    }

    // Handle method similarity API endpoint
    if (pathname === '/api/method-similarity' && req.method === 'GET') {
      try {
        // Get all methods with their similarity warnings
        const allMethods = [];
        components.forEach(component => {
          if (component.methods && component.methods.length > 0) {
            component.methods.forEach(method => {
              if (method.similarityWarnings && method.similarityWarnings.length > 0) {
                allMethods.push({
                  componentName: component.name,
                  methodName: method.name,
                  code: method.code || '',
                  similarityWarnings: method.similarityWarnings
                });
              }
            });
          }
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(allMethods));
      } catch (error) {
        console.error('Error handling method similarity request:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
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
  console.log('💬 AI Chat API available at: http://localhost:${PORT}/api/chat');
  console.log('📝 Component Code API available at: http://localhost:${PORT}/api/component-code?name=ComponentName');
  console.log('🔄 Method Similarity API available at: http://localhost:${PORT}/api/method-similarity');
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
