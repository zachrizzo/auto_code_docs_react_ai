# Configuration Files

This directory contains configuration files that are packaged with the application.

## LangFlow Configuration

### `langflow-config.json`

This file contains the LangFlow workflow configuration that defines how the AI chat system processes requests. It includes:

- **OllamaEmbeddings**: Configuration for generating embeddings using Ollama's `nomic-embed-text:latest` model
- **FAISS Vector Store**: Setup for document storage and similarity search
- **Document Processing Pipeline**: Components for parsing and formatting documentation
- **OllamaModel**: Configuration for text generation using Ollama's `gemma3:4b` model
- **Chat Input/Output**: Interface components for the chat system

### Usage in Production

When the application starts in production:
1. Docker containers are launched using `docker/docker-compose.yml`
2. The LangFlow config is automatically mounted from `configs/langflow-config.json` to `/app/langflow-config.json` inside the container
3. LangFlow loads this configuration and uses it to process all chat requests

### Customizing the Configuration

To customize the AI behavior:
1. Export your flow from LangFlow UI as JSON
2. Replace `configs/langflow-config.json` with your custom configuration
3. Restart the application

The system will prioritize configs in this order:
1. `configs/langflow-config.json` (preferred - packaged with app)
2. `langflow-config.json` (project root)
3. `temp/langflow-config.json` (temporary files)

### Configuration Structure

The LangFlow config uses a node-based workflow with these key components:
- **ChatInput**: Receives user messages
- **Directory**: Loads documentation files
- **OllamaEmbeddings**: Generates embeddings for semantic search
- **FAISS**: Performs vector similarity search
- **Parser**: Formats search results
- **Prompt**: Combines context with user question
- **OllamaModel**: Generates AI responses
- **ChatOutput**: Returns formatted responses 