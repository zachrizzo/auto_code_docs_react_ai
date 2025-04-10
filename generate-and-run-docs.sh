#!/bin/bash

# Find a free port
find_free_port() {
  local port=8080
  while nc -z localhost $port 2>/dev/null; do
    ((port++))
  done
  echo $port
}

# Set port for server
PORT=$(find_free_port)

echo "🔍 Using port $PORT for server"

# Create helper script with generate_docs function
cat > generate_docs_helper.sh << 'EOF'
#!/bin/bash

echo "📚 Generating documentation..."

# We now use the DocumentAll.tsx file directly
node dist/cli/index.js -c examples/DocumentAll.tsx -o todoitem-docs

# Also run the example-usage.ts script to generate docs in example-docs
echo "📚 Also generating documentation via example-usage.ts..."
npx ts-node examples/example-usage.ts

echo "✅ Documentation generated at todoitem-docs and example-docs"
EOF

chmod +x generate_docs_helper.sh

# Initial documentation generation
echo "⏳ Starting initial documentation generation..."
./generate_docs_helper.sh

# Check if todoitem-docs directory exists
if [ ! -d "todoitem-docs" ]; then
  echo "❌ Error: todoitem-docs directory was not created. Check for errors above."
  rm generate_docs_helper.sh
  exit 1
fi

# Kill any existing http-server instances for this project only
pids=$(lsof -t -i:$PORT 2>/dev/null)
if [ ! -z "$pids" ]; then
  echo "🧹 Cleaning up process using port $PORT..."
  kill $pids 2>/dev/null || true
  sleep 1
fi

# Start HTTP server
echo "🚀 Starting HTTP server on port $PORT..."
(cd todoitem-docs && http-server -p $PORT --cors -c-1) &
HTTP_SERVER_PID=$!

# Wait for server to start
sleep 2

# Check if server is running
if ! curl -s "http://localhost:$PORT" > /dev/null; then
  echo "❌ Error: Server failed to start on port $PORT."
  kill $HTTP_SERVER_PID 2>/dev/null || true
  exit 1
fi

# Start another server for example-docs
echo "🚀 Starting HTTP server for example-docs on port $((PORT+1))..."
(cd example-docs && http-server -p $((PORT+1)) --cors -c-1) &
EXAMPLE_DOCS_SERVER_PID=$!

# Run the verification test
echo "🧪 Running documentation verification test..."
if node tests/verify-documentation.js $PORT; then
  echo "✅ Documentation verification passed!"
else
  echo "❌ Documentation verification failed!"
  echo "   Please check the output above for details."
fi

# Watch for changes
echo "👀 Watching for changes in examples/ and src/ directories..."
(nodemon --watch examples/ --watch src/ --ext tsx,ts,jsx,js --exec "./generate_docs_helper.sh") &
NODEMON_PID=$!

# Success message
echo ""
echo "✅ Documentation servers running successfully!"
echo "📊 Main docs URL: http://localhost:$PORT"
echo "📊 Example docs URL: http://localhost:$((PORT+1))"
echo "🔄 Auto-refresh active for examples/ and src/ directories"
echo "⏹️  Press Ctrl+C to stop all processes"
echo ""

# Trap termination
trap "echo '🛑 Shutting down...'; kill $HTTP_SERVER_PID $EXAMPLE_DOCS_SERVER_PID $NODEMON_PID 2>/dev/null; rm generate_docs_helper.sh; echo '👋 Goodbye!'" EXIT INT TERM

# Keep script running
wait
