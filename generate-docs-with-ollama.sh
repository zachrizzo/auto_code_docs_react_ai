#!/bin/bash

# Colors for output
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
BLUE="\033[0;34m"
RESET="\033[0m"

# Default values
COMPONENT_PATH="examples/DocumentAll.tsx"
OUTPUT_DIR="docs-with-ollama"
SIMILARITY_THRESHOLD=0.6
OLLAMA_URL="http://localhost:11434"
OLLAMA_MODEL="nomic-embed-text:latest" # Model that supports embeddings

# Function to find an available port
find_available_port() {
  local port=3000
  while
    (echo >/dev/tcp/localhost/$port) &>/dev/null
  do
    port=$((port + 1))
  done
  echo $port
}

# Find an available port
PORT=$(find_available_port)

# Check if the component file exists
if [ ! -f "$COMPONENT_PATH" ]; then
  echo -e "${YELLOW}Component file '$COMPONENT_PATH' does not exist.${RESET}"
  exit 1
fi

# Check if Ollama is running
echo -e "${BLUE}Checking if Ollama is running...${RESET}"
if ! curl -s "$OLLAMA_URL/api/tags" > /dev/null; then
  echo -e "${YELLOW}Ollama doesn't seem to be running at $OLLAMA_URL${RESET}"
  echo -e "${YELLOW}Please start Ollama first:${RESET}"
  echo -e "${GREEN}  ollama serve${RESET}"
  exit 1
fi

# Check if the model is available using ollama list
echo -e "${BLUE}Checking if $OLLAMA_MODEL is available...${RESET}"
if ! ollama list | grep -q "$OLLAMA_MODEL"; then
  echo -e "${YELLOW}Model '$OLLAMA_MODEL' is not available.${RESET}"
  echo -e "${YELLOW}Please pull it first:${RESET}"
  echo -e "${GREEN}  ollama pull $OLLAMA_MODEL${RESET}"
  exit 1
fi

echo -e "${GREEN}Generating documentation using Ollama for embeddings...${RESET}"
echo -e "${BLUE}Component path: ${RESET}$COMPONENT_PATH"
echo -e "${BLUE}Output directory: ${RESET}$OUTPUT_DIR"
echo -e "${BLUE}Similarity threshold: ${RESET}$SIMILARITY_THRESHOLD"
echo -e "${BLUE}Ollama URL: ${RESET}$OLLAMA_URL"
echo -e "${BLUE}Ollama model: ${RESET}$OLLAMA_MODEL"
echo -e "${BLUE}Server port: ${RESET}$PORT"

# Run the documentation generator
node dist/cli/index.js \
  --component "$COMPONENT_PATH" \
  --output "$OUTPUT_DIR" \
  --use-ollama \
  --ollama-url "$OLLAMA_URL" \
  --ollama-model "$OLLAMA_MODEL" \
  --similarity-threshold "$SIMILARITY_THRESHOLD" \
  --port "$PORT"

# Check if generation was successful
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Documentation generated successfully!${RESET}"
  echo -e "${BLUE}The documentation is available at:${RESET} $OUTPUT_DIR"
  echo -e "${BLUE}You can view it at:${RESET} http://localhost:$PORT"
else
  echo -e "${YELLOW}Documentation generation failed.${RESET}"
fi
