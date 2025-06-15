# Python Environment Fix 🐍

## Problem
Your Homebrew Python installation is "externally managed" (PEP 668), which prevents direct package installation to avoid conflicts with system packages.

## Solution: Multiple Installation Strategies

The embedded server now tries multiple strategies automatically:

### 🥇 **Strategy 1: Virtual Environment (Recommended)**
- Creates isolated virtual environment in `temp/codey-venv/`
- Installs packages without affecting system Python
- Automatically uses venv Python for server execution

### 🥈 **Strategy 2: User Installation**
- Uses `pip install --user` to install in user directory
- Safe for most systems, doesn't require admin rights

### 🥉 **Strategy 3: Break System Packages (Last Resort)**
- Uses `--break-system-packages` flag
- Only when other strategies fail
- Warns user about potential system impact

## Quick Setup Options

### Option A: Automatic (Recommended)
```bash
# Just run - it will handle everything automatically
npx code-y generate
```

### Option B: Pre-setup Virtual Environment
```bash
# Run the setup script once
./scripts/setup-python.sh

# Then use normally
npx code-y generate
```

### Option C: Manual Virtual Environment
```bash
# Create your own venv
python3 -m venv ~/.codey-venv
source ~/.codey-venv/bin/activate
pip install fastapi uvicorn sentence-transformers faiss-cpu numpy pydantic httpx

# Set environment variable
export CODEY_PYTHON_PATH=~/.codey-venv/bin/python

# Run code-y
npx code-y generate
```

### Option D: System Override (Not Recommended)
```bash
# Override Homebrew protection (affects system Python)
echo "break-system-packages = true" >> ~/.pip/pip.conf

# Then run normally
npx code-y generate
```

## What Happens Now

When you run `npx code-y generate`, the system will:

1. **🔍 Detect Python**: Finds your Python 3.13.4
2. **📦 Create Virtual Environment**: Makes isolated environment
3. **⬇️ Install Packages**: Downloads AI libraries to venv only
4. **🚀 Start Server**: Runs embedded AI server using venv Python
5. **✅ Success**: Provides full AI features without system conflicts

## Expected Output

```bash
🚀 Starting AI services...
📦 Attempting to start embedded Python server...
✅ Found Python: python3
📦 Setting up Python environment...
   📦 Creating virtual environment...
   📦 Installing packages in virtual environment...
✅ Virtual environment created and packages installed
🚀 Starting embedded LangFlow server on port 6271...
✅ AI server running (embedded): http://localhost:6271
```

## Benefits

✅ **No System Impact**: Virtual environment keeps AI packages isolated  
✅ **Automatic Setup**: Handles complex Python environment issues  
✅ **Cross-Platform**: Works on macOS, Windows, Linux  
✅ **Multiple Fallbacks**: Tries different strategies until one works  
✅ **User Choice**: Can override with environment variables  

## Troubleshooting

### Virtual Environment Creation Fails
```bash
# Install venv module if missing
python3 -m pip install --user virtualenv

# Or use our setup script
./scripts/setup-python.sh
```

### All Strategies Fail
```bash
# Manual installation
python3 -m venv ~/.codey-venv
source ~/.codey-venv/bin/activate
pip install fastapi uvicorn sentence-transformers faiss-cpu numpy pydantic httpx

# Set environment variable
export CODEY_PYTHON_PATH=~/.codey-venv/bin/python
```

### Permission Issues
```bash
# Use pipx (recommended by Homebrew)
brew install pipx
pipx install fastapi uvicorn sentence-transformers faiss-cpu numpy pydantic httpx
```

The embedded server will now work seamlessly with your Homebrew Python installation! 🎉