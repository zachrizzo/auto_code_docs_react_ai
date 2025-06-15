# AI Setup - Zero Configuration Required! 🚀

Code-y now includes **embedded AI capabilities** that work out of the box with minimal setup!

## How It Works

When you run `npx code-y generate`, the system automatically:

1. **🐍 Tries Embedded Python Server** (Recommended)
   - Starts a lightweight Python server using your system's Python
   - Automatically installs required packages (FastAPI, sentence-transformers, etc.)
   - Uses FAISS for vector similarity search
   - Integrates with Ollama for AI responses

2. **🐳 Falls back to Docker** (If Python unavailable)
   - Uses the full Docker setup with LangFlow + Redis
   - Requires Docker to be installed

3. **💬 Falls back to Legacy Chat** (If both unavailable)
   - Basic AI chat without vector search
   - Still works with Ollama

## Installation Requirements

### Option 1: Python (Recommended - Easiest)
```bash
# Most systems already have Python
python --version  # or python3 --version

# If not installed:
# macOS: brew install python
# Windows: Download from python.org
# Linux: sudo apt install python3 python3-pip
```

### Option 2: Docker (Alternative)
```bash
# Install Docker Desktop
# https://www.docker.com/get-started
```

### Option 3: None (Legacy mode)
```bash
# Just Ollama for basic chat
# https://ollama.ai
```

## Usage Examples

### Default (AI Enabled)
```bash
npx code-y generate
# ✅ AI server running (embedded): http://localhost:6271
```

### With Custom LangFlow Config
```bash
npx code-y generate --langflow-config ./my-flow.json
```

### Disable AI Features
```bash
npx code-y generate --no-ai
```

## What You Get

### 🧠 **Smart AI Chat**
- Understands your entire codebase
- Vector similarity search across components
- Context-aware responses about your code

### 📚 **Automatic Documentation**
- Component extraction and analysis
- Method documentation with AI descriptions
- Relationship mapping between components

### 🎨 **Beautiful UI**
- Interactive documentation browser
- Live chat with your codebase
- Code similarity analysis

## Troubleshooting

### Python Issues
```bash
# Check Python installation
python --version
python3 --version

# Install pip if missing
curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
python get-pip.py
```

### Package Installation Issues
```bash
# The embedded server auto-installs these packages:
pip install fastapi uvicorn sentence-transformers faiss-cpu numpy httpx pydantic

# If you get permission errors, try:
pip install --user fastapi uvicorn sentence-transformers faiss-cpu numpy httpx pydantic
```

### Ollama Setup (Optional but Recommended)
```bash
# Install Ollama for better AI responses
curl -fsSL https://ollama.ai/install.sh | sh

# Pull required models
ollama pull gemma3:4b
ollama pull nomic-embed-text:latest
```

## Why This Approach?

### ✅ **Pros of Embedded Python**
- **Zero Docker Required**: Works on any system with Python
- **Faster Startup**: No container overhead
- **Lighter Resource Usage**: Only what you need
- **Easier Development**: Direct Python debugging
- **Better Package Integration**: Part of your npm install

### ✅ **Pros of Docker Fallback**
- **Consistent Environment**: Same setup everywhere
- **Full LangFlow Features**: Visual flow programming
- **Redis Caching**: Better performance for large codebases
- **Isolation**: Doesn't affect your system Python

### 🎯 **Best of Both Worlds**
The system automatically chooses the best option available on your system, so you get AI features with minimal setup while still having access to advanced Docker features when needed.

## Advanced Configuration

### Force Embedded Mode
```javascript
// codey.config.js
module.exports = {
  aiProvider: 'embedded',  // Force embedded Python
  // ... other config
};
```

### Force Docker Mode
```javascript
// codey.config.js
module.exports = {
  aiProvider: 'docker',   // Force Docker containers
  // ... other config
};
```

## Performance Comparison

| Feature | Embedded Python | Docker | Legacy |
|---------|----------------|--------|--------|
| Startup Time | ~10 seconds | ~30 seconds | ~2 seconds |
| Memory Usage | ~200MB | ~500MB | ~50MB |
| AI Quality | High | High | Medium |
| Setup Complexity | Low | Medium | Very Low |
| Feature Set | Full | Full+ | Basic |

## Summary

**Just run `npx code-y generate`** and the system will automatically give you the best AI experience available on your system! No complex setup required. 🎉