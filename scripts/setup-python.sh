#!/bin/bash

echo "🐍 Setting up Python environment for code-y AI features..."

# Check if python3 exists
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.8+ first:"
    echo "   macOS: brew install python"
    echo "   Windows: https://python.org/downloads"
    echo "   Linux: sudo apt install python3 python3-pip"
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 --version 2>&1 | grep -oE '[0-9]+\.[0-9]+')
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)

if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 8 ]); then
    echo "❌ Python 3.8+ required. Found: $PYTHON_VERSION"
    exit 1
fi

echo "✅ Found Python $PYTHON_VERSION"

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv ~/.codey-venv

# Activate virtual environment
source ~/.codey-venv/bin/activate

# Install packages
echo "📦 Installing AI packages..."
pip install --upgrade pip
pip install \
    "fastapi>=0.115.0" \
    "uvicorn[standard]>=0.32.0" \
    "faiss-cpu>=1.8.0" \
    "numpy>=2.0.0" \
    "sentence-transformers>=3.3.0" \
    "pydantic>=2.10.0" \
    "httpx>=0.28.0"

if [ $? -eq 0 ]; then
    echo "✅ Python environment setup complete!"
    echo ""
    echo "To use the AI features:"
    echo "1. source ~/.codey-venv/bin/activate"
    echo "2. npx code-y generate"
    echo ""
    echo "Or set environment variable to use this venv automatically:"
    echo "export CODEY_PYTHON_PATH=~/.codey-venv/bin/python"
else
    echo "❌ Package installation failed"
    exit 1
fi