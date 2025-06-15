# LangFlow AI Integration

Code-y now includes powerful AI capabilities by default using LangFlow for enhanced documentation generation and intelligent chat.

## Overview

Code-y automatically starts a Docker-based AI server that includes:

- **LangFlow Visual Programming**: Uses your existing `Codey-ai.json` or default configuration
- **FAISS Vector Database**: High-performance similarity search
- **Redis Caching**: Fast response times
- **Ollama Integration**: Local AI models
- **Advanced RAG**: Retrieval-Augmented Generation with your codebase

## Quick Start

### 1. Generate Documentation with AI (Default)

```bash
npx code-y generate
```

This command automatically:
- Starts Docker containers (LangFlow server + Redis)
- Loads your LangFlow configuration from `langflow-config.json` (if available)
- Indexes your codebase in the vector database
- Starts the documentation UI with enhanced AI chat

### 2. Custom LangFlow Configuration

If you have a custom LangFlow JSON file:

```bash
npx code-y generate --langflow-config ./path/to/your-flow.json
```

### 3. Disable AI Features

If you prefer the basic documentation without AI:

```bash
npx code-y generate --no-ai
```

## Features

### Enhanced AI Chat
- Smarter responses using your custom LangFlow
- Vector similarity search across your entire codebase
- Context-aware conversations with memory
- Real-time code understanding

### Automatic Vectorization
- All components and methods are automatically indexed
- FAISS vector database for fast similarity search
- Semantic search across code, comments, and documentation

### Visual Flow Design
- Use LangFlow's visual interface to customize AI behavior
- Drag-and-drop flow components
- Export and version control your AI flows

## Configuration

### Docker Services

The integration starts these services:

```yaml
services:
  langflow-server:    # Port 6271
  redis:             # Port 6379
```

### Environment Variables

```bash
USE_LANGFLOW=true                    # Enable LangFlow
LANGFLOW_URL=http://localhost:6271   # LangFlow server URL
OLLAMA_HOST=http://host.docker.internal:11434  # Ollama integration
```

## LangFlow Configuration

Your `langflow-config.json` should include these components:

```json
{
  "data": {
    "nodes": [
      {
        "data": {
          "type": "ChatInput"
        }
      },
      {
        "data": {
          "type": "FAISS"
        }
      },
      {
        "data": {
          "type": "OllamaEmbeddings"
        }
      },
      {
        "data": {
          "type": "OllamaModel"
        }
      },
      {
        "data": {
          "type": "ChatOutput"
        }
      }
    ]
  }
}
```

## API Endpoints

The LangFlow server provides these endpoints:

### Chat
```bash
POST http://localhost:6271/chat
{
  "message": "How does the UserAuth component work?",
  "context": {},
  "sessionId": "session_123"
}
```

### Add Documents
```bash
POST http://localhost:6271/documents/add
{
  "docId": "component_UserAuth",
  "content": "UserAuth component handles authentication...",
  "metadata": {
    "type": "component",
    "name": "UserAuth"
  }
}
```

### Search Documents
```bash
POST http://localhost:6271/documents/search
{
  "query": "authentication methods",
  "top_k": 5
}
```

## Development Workflow

### 1. Design Your Flow
1. Use LangFlow UI to design your AI flow
2. Export as JSON
3. Save as `langflow-config.json` in your project

### 2. Test Locally
```bash
# Start with AI (default behavior)
npx code-y generate

# View logs
npm run docker:logs

# Stop containers
npm run docker:stop
```

### 3. Production Deployment
```bash
# Build for production
docker build -t your-app/langflow -f python-server/Dockerfile .

# Deploy with your existing infrastructure
docker run -p 6271:6271 your-app/langflow
```

## Troubleshooting

### Docker Issues
```bash
# Check Docker is running
docker --version
docker ps

# View container logs
docker logs codey-langflow-server
docker logs codey-redis
```

### LangFlow Issues
```bash
# Check server health
curl http://localhost:6271/health

# View server logs
npm run docker:logs
```

### Ollama Issues
```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# Pull required models
ollama pull nomic-embed-text:latest
ollama pull gemma3:4b
```

## Advanced Usage

### Custom Embeddings Model
```bash
npx code-y generate --ollama-embedding-model custom-embed:latest
```

### Custom Chat Model
```bash
npx code-y generate --ollama-model llama3:8b
```

### Multiple Flows
```bash
# Switch between different flows
npx code-y generate --langflow-config ./flows/production.json
npx code-y generate --langflow-config ./flows/development.json
```

## Benefits

1. **Better AI Responses**: LangFlow provides more sophisticated AI flows than basic chat
2. **Visual Programming**: Design AI behavior without coding
3. **Scalable**: Docker containers can be scaled independently
4. **Local & Private**: Everything runs locally, no external API calls required
5. **Customizable**: Full control over AI model behavior through LangFlow
6. **Production Ready**: Redis caching and robust error handling

## Migration from Legacy Chat

LangFlow AI is now enabled by default! The system automatically falls back to legacy chat if Docker/LangFlow is unavailable, so existing projects continue to work without changes.

**What changed:**
- `npx code-y generate` now starts AI services automatically
- Enhanced AI chat is the default experience
- Legacy chat is used as fallback when Docker isn't available

**If you prefer legacy chat:**
```bash
npx code-y generate --no-ai
```

The UI automatically detects and uses LangFlow when available, providing enhanced responses with better context awareness and smarter code understanding.