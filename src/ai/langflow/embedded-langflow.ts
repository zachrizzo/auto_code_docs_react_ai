import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs-extra';
import axios from 'axios';

export interface EmbeddedLangFlowOptions {
  port?: number;
  pythonPath?: string;
  langflowConfigPath?: string;
  ollamaUrl?: string;
}

export class EmbeddedLangFlow {
  private process?: ChildProcess;
  private port: number;
  private pythonPath: string;
  private configPath?: string;
  private ollamaUrl: string;

  constructor(options: EmbeddedLangFlowOptions = {}) {
    this.port = options.port || 6271;
    this.pythonPath = options.pythonPath || process.env.CODEY_PYTHON_PATH || this.detectPython();
    this.configPath = options.langflowConfigPath;
    this.ollamaUrl = options.ollamaUrl || 'http://localhost:11434';
  }

  /**
   * Detect available Python command
   */
  private detectPython(): string {
    const candidates = ['python3', 'python', 'python3.13', 'python3.12', 'python3.11', 'python3.10', 'python3.9', 'python3.8'];
    // For now, prefer python3 as it's most common on modern systems
    return 'python3';
  }

  /**
   * Check if Python is available and find working command
   */
  async checkPython(): Promise<boolean> {
    const candidates = ['python3', 'python', 'python3.13', 'python3.12', 'python3.11', 'python3.10', 'python3.9', 'python3.8'];
    
    for (const candidate of candidates) {
      const works = await this.testPythonCommand(candidate);
      if (works) {
        console.log(`✅ Found Python: ${candidate}`);
        this.pythonPath = candidate;
        return true;
      }
    }
    
    console.error('❌ No working Python installation found');
    console.error('   Tried:', candidates.join(', '));
    return false;
  }

  /**
   * Test if a Python command works
   */
  private async testPythonCommand(pythonCmd: string): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn(pythonCmd, ['--version'], { stdio: 'pipe' });
      
      let output = '';
      proc.stdout?.on('data', (data) => {
        output += data.toString();
      });
      
      proc.stderr?.on('data', (data) => {
        output += data.toString();
      });
      
      proc.on('close', (code) => {
        if (code === 0 && output.includes('Python')) {
          // Check if it's Python 3.8+
          const versionMatch = output.match(/Python (\d+)\.(\d+)/);
          if (versionMatch) {
            const major = parseInt(versionMatch[1]);
            const minor = parseInt(versionMatch[2]);
            if (major >= 3 && minor >= 8) {
              resolve(true);
              return;
            }
          }
        }
        resolve(false);
      });
      
      proc.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Install required Python packages
   */
  async installDependencies(): Promise<boolean> {
    try {
      console.log('📦 Setting up Python environment...');
      console.log(`   Using Python: ${this.pythonPath}`);
      
      const packages = [
        'fastapi>=0.115.0',
        'uvicorn[standard]>=0.32.0', 
        'faiss-cpu>=1.8.0',
        'numpy>=2.0.0',
        'sentence-transformers>=3.3.0',
        'pydantic>=2.10.0',
        'httpx>=0.28.0'
      ];

      // First check if packages are already installed
      const installedPackages = await this.checkInstalledPackages();
      const needToInstall = packages.filter(pkg => {
        const pkgName = pkg.split('>=')[0].split('[')[0];
        return !installedPackages.includes(pkgName);
      });

      if (needToInstall.length === 0) {
        console.log('✅ All Python dependencies already installed');
        return true;
      }

      console.log(`   Installing: ${needToInstall.join(', ')}`);

      // Try multiple installation strategies
      const strategies = [
        // Strategy 1: Use virtual environment
        () => this.installWithVirtualEnv(needToInstall),
        // Strategy 2: Use --user flag
        () => this.installWithUser(needToInstall),
        // Strategy 3: Use --break-system-packages (last resort)
        () => this.installWithBreakSystemPackages(needToInstall)
      ];

      for (const strategy of strategies) {
        const success = await strategy();
        if (success) {
          console.log('✅ Python dependencies installed successfully');
          return true;
        }
      }

      console.warn('⚠️  Failed to install dependencies with all strategies, but continuing...');
      return true; // Continue anyway, the server script will handle missing deps
      
    } catch (error) {
      console.warn('⚠️  Dependency installation failed, but continuing...');
      return true; // Continue anyway
    }
  }

  /**
   * Install packages using virtual environment
   */
  private async installWithVirtualEnv(packages: string[]): Promise<boolean> {
    try {
      console.log('   📦 Creating virtual environment...');
      
      const venvPath = path.join(__dirname, '../../../temp/codey-venv');
      await fs.ensureDir(path.dirname(venvPath));
      
      // Create virtual environment
      const createVenv = spawn(this.pythonPath, ['-m', 'venv', venvPath], { stdio: 'pipe' });
      await new Promise<void>((resolve, reject) => {
        createVenv.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error('Failed to create venv'));
        });
      });

      // Determine the python path in venv
      const venvPython = process.platform === 'win32' 
        ? path.join(venvPath, 'Scripts', 'python.exe')
        : path.join(venvPath, 'bin', 'python');

      // Install packages in venv
      console.log('   📦 Installing packages in virtual environment...');
      return new Promise((resolve) => {
        const proc = spawn(venvPython, ['-m', 'pip', 'install', ...packages], {
          stdio: 'inherit'
        });

        proc.on('close', (code) => {
          if (code === 0) {
            // Update python path to use venv
            this.pythonPath = venvPython;
            console.log('✅ Virtual environment created and packages installed');
            resolve(true);
          } else {
            console.warn('⚠️  Virtual environment installation failed, trying next strategy...');
            resolve(false);
          }
        });

        proc.on('error', () => {
          resolve(false);
        });
      });
    } catch (error) {
      console.warn('⚠️  Virtual environment strategy failed, trying next...');
      return false;
    }
  }

  /**
   * Install packages with --user flag
   */
  private async installWithUser(packages: string[]): Promise<boolean> {
    console.log('   📦 Trying installation with --user flag...');
    
    return new Promise((resolve) => {
      const proc = spawn(this.pythonPath, ['-m', 'pip', 'install', '--user', ...packages], {
        stdio: 'inherit'
      });

      proc.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Packages installed with --user flag');
          resolve(true);
        } else {
          console.warn('⚠️  --user installation failed, trying next strategy...');
          resolve(false);
        }
      });

      proc.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Install packages with --break-system-packages (last resort)
   */
  private async installWithBreakSystemPackages(packages: string[]): Promise<boolean> {
    console.log('   📦 Trying installation with --break-system-packages (last resort)...');
    console.warn('   ⚠️  This may affect your system Python installation');
    
    return new Promise((resolve) => {
      const proc = spawn(this.pythonPath, ['-m', 'pip', 'install', '--break-system-packages', ...packages], {
        stdio: 'inherit'
      });

      proc.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Packages installed with --break-system-packages');
          resolve(true);
        } else {
          console.error('❌ All installation strategies failed');
          resolve(false);
        }
      });

      proc.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Check which packages are already installed
   */
  private async checkInstalledPackages(): Promise<string[]> {
    return new Promise((resolve) => {
      const proc = spawn(this.pythonPath, ['-m', 'pip', 'list', '--format=freeze'], {
        stdio: 'pipe'
      });

      let output = '';
      proc.stdout?.on('data', (data) => {
        output += data.toString();
      });

      proc.on('close', () => {
        const packages = output.split('\n')
          .map(line => line.split('==')[0].toLowerCase())
          .filter(pkg => pkg.length > 0);
        resolve(packages);
      });

      proc.on('error', () => {
        resolve([]);
      });
    });
  }

  /**
   * Load LangFlow configuration from JSON file
   */
  private async loadLangFlowConfig(): Promise<void> {
    try {
      // Look for LangFlow config in multiple locations
      const possiblePaths = [
        this.configPath, // Explicitly provided path
        path.join(process.cwd(), 'langflow-config.json'),
        path.join(process.cwd(), 'Codey-ai.json'), // Your existing config!
        path.join(__dirname, '../../../langflow-config.json'),
        path.join(__dirname, '../../../Codey-ai.json')
      ].filter(Boolean) as string[];

      let configFound = false;
      let langflowConfig: any = null;

      for (const configPath of possiblePaths) {
        if (await fs.pathExists(configPath)) {
          console.log(`✅ Loading LangFlow config: ${path.relative(process.cwd(), configPath)}`);
          
          try {
            const configContent = await fs.readFile(configPath, 'utf-8');
            langflowConfig = JSON.parse(configContent);
            this.configPath = configPath;
            configFound = true;
            
            // Validate that it looks like a LangFlow config
            if (langflowConfig.data && langflowConfig.data.nodes) {
              console.log(`✅ Found ${langflowConfig.data.nodes.length} nodes in LangFlow configuration`);
              
              // Log node types for debugging
              const nodeTypes = langflowConfig.data.nodes.map((node: any) => node.data?.type).filter(Boolean);
              console.log(`   Node types: ${[...new Set(nodeTypes)].join(', ')}`);
            }
            
            break;
          } catch (parseError) {
            console.warn(`⚠️  Failed to parse config at ${configPath}:`, parseError);
            continue;
          }
        }
      }

      if (!configFound) {
        console.log('ℹ️  No LangFlow configuration found - using default AI flow');
        console.log('   Looked in:', possiblePaths.map(p => path.relative(process.cwd(), p)).join(', '));
        console.log('   To use custom LangFlow, export your flow as JSON and save as "Codey-ai.json"');
      }

      // Store config for use in server script
      if (langflowConfig) {
        const tempDir = path.join(__dirname, '../../../temp');
        await fs.ensureDir(tempDir);
        await fs.writeFile(
          path.join(tempDir, 'langflow-config.json'),
          JSON.stringify(langflowConfig, null, 2)
        );
      }

    } catch (error) {
      console.warn('⚠️  Error loading LangFlow config:', error);
    }
  }

  /**
   * Create a simplified Python server script
   */
  private async createServerScript(): Promise<string> {
    const serverScript = `
import json
import os
import sys
from pathlib import Path
from typing import Dict, Any, List, Optional
import asyncio
import logging
from datetime import datetime
import warnings

# Suppress warnings for cleaner output
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)

try:
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    import uvicorn
    import numpy as np
    from sentence_transformers import SentenceTransformer
    import faiss
    import httpx
    print("✅ All dependencies loaded successfully")
except ImportError as e:
    print(f"❌ Missing dependency: {e}")
    print("Installing dependencies...")
    import subprocess
    packages = ["fastapi>=0.115.0", "uvicorn[standard]>=0.32.0", "sentence-transformers>=3.3.0", "faiss-cpu>=1.8.0", "numpy>=2.0.0", "httpx>=0.28.0", "pydantic>=2.10.0"]
    
    # Try multiple installation strategies
    strategies = [
        [sys.executable, "-m", "pip", "install", "--user"],
        [sys.executable, "-m", "pip", "install", "--break-system-packages"],
        [sys.executable, "-m", "pip", "install"]
    ]
    
    installed_any = False
    for strategy in strategies:
        print(f"Trying installation strategy: {' '.join(strategy[3:])}")
        success_count = 0
        for package in packages:
            try:
                subprocess.check_call(strategy + [package], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                success_count += 1
            except Exception:
                pass
        
        if success_count > 0:
            print(f"✅ Installed {success_count}/{len(packages)} packages")
            installed_any = True
            break
        else:
            print(f"❌ Strategy failed")
    
    if not installed_any:
        print("❌ All installation strategies failed")
        print("Please install packages manually:")
        print("  python3 -m venv venv")
        print("  source venv/bin/activate")
        print(f"  pip install {' '.join(packages)}")
        sys.exit(1)
    else:
        print("✅ Some packages installed, attempting to continue...")
        # Try importing again
        try:
            from fastapi import FastAPI, HTTPException
            from fastapi.middleware.cors import CORSMiddleware
            from pydantic import BaseModel
            import uvicorn
            import numpy as np
            from sentence_transformers import SentenceTransformer
            import faiss
            import httpx
            print("✅ Successfully imported dependencies after installation")
        except ImportError as still_missing:
            print(f"❌ Still missing dependencies after installation: {still_missing}")
            sys.exit(1)

# Models
class ChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str
    metadata: Optional[Dict[str, Any]] = None

class DocumentRequest(BaseModel):
    content: str
    metadata: Dict[str, Any]
    doc_id: str

class SearchRequest(BaseModel):
    query: str
    top_k: int = 5

# Global variables
app = FastAPI(title="Embedded LangFlow Server", version="0.1.0")
embedder = None
vector_db = None
documents = {}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SimpleVectorDB:
    def __init__(self, embedder):
        self.embedder = embedder
        self.index = None
        self.metadata = {}
        self.doc_count = 0
        
    def initialize(self):
        # Create FAISS index with 384 dimensions (sentence-transformers default)
        self.index = faiss.IndexFlatL2(384)
        
    def add_document(self, doc_id: str, content: str, metadata: Dict[str, Any]):
        if self.index is None:
            self.initialize()
            
        # Generate embedding
        embedding = self.embedder.encode([content])
        
        # Add to index
        self.index.add(embedding)
        
        # Store metadata
        self.metadata[self.doc_count] = {
            'doc_id': doc_id,
            'content': content,
            'metadata': metadata,
            'timestamp': datetime.now().isoformat()
        }
        self.doc_count += 1
        
    def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        if self.index is None or self.index.ntotal == 0:
            return []
            
        # Generate query embedding
        query_embedding = self.embedder.encode([query])
        
        # Search
        distances, indices = self.index.search(query_embedding, min(top_k, self.index.ntotal))
        
        # Prepare results
        results = []
        for i, idx in enumerate(indices[0]):
            if idx != -1 and idx in self.metadata:
                result = self.metadata[idx].copy()
                result['score'] = float(distances[0][i])
                results.append(result)
        
        return results

@app.on_event("startup")
async def startup_event():
    global embedder, vector_db
    try:
        print("Initializing embedder...")
        embedder = SentenceTransformer('all-MiniLM-L6-v2')
        vector_db = SimpleVectorDB(embedder)
        print("✅ Embedded LangFlow server initialized")
    except Exception as e:
        print(f"❌ Failed to initialize server: {e}")

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "embedder": embedder is not None,
        "vector_db": vector_db is not None
    }

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        if not vector_db:
            raise HTTPException(status_code=503, detail="Vector DB not initialized")
        
        # Search for relevant context
        search_results = vector_db.search(request.message, top_k=3)
        
        # Simple response generation (can be enhanced with actual LangFlow)
        context_text = ""
        if search_results:
            context_text = "\\n".join([r['content'][:200] + "..." for r in search_results[:2]])
        
        # Generate response using Ollama if available
        response_text = await generate_ollama_response(request.message, context_text)
        
        session_id = request.session_id or f"session_{datetime.now().timestamp()}"
        
        return ChatResponse(
            response=response_text,
            session_id=session_id,
            metadata={"search_results_count": len(search_results)}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def generate_ollama_response(query: str, context: str) -> str:
    try:
        ollama_url = "${this.ollamaUrl}"
        
        prompt = f"""Based on the following code documentation context, please answer the user's question:

Context:
{context}

Question: {query}

Please provide a helpful and accurate response based on the context provided."""

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{ollama_url}/api/chat",
                json={
                    "model": "gemma3:4b",
                    "messages": [
                        {"role": "user", "content": prompt}
                    ],
                    "stream": False
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get("message", {}).get("content", "I couldn't generate a response.")
            else:
                return f"Based on the documentation: {context[:300]}... I can help answer questions about this code."
                
    except Exception as e:
        print(f"Ollama error: {e}")
        return f"I found relevant documentation: {context[:300]}... Please let me know if you need more specific information."

@app.post("/documents/add")
async def add_document(request: DocumentRequest):
    try:
        if not vector_db:
            raise HTTPException(status_code=503, detail="Vector DB not initialized")
        
        vector_db.add_document(
            doc_id=request.doc_id,
            content=request.content,
            metadata=request.metadata
        )
        
        return {"status": "success", "doc_id": request.doc_id}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/documents/search")
async def search_documents(request: SearchRequest):
    try:
        if not vector_db:
            raise HTTPException(status_code=503, detail="Vector DB not initialized")
        
        results = vector_db.search(request.query, request.top_k)
        
        return {"results": results, "count": len(results)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/documents/batch")
async def batch_add_documents(documents: List[DocumentRequest]):
    try:
        if not vector_db:
            raise HTTPException(status_code=503, detail="Vector DB not initialized")
        
        for doc in documents:
            vector_db.add_document(
                doc_id=doc.doc_id,
                content=doc.content,
                metadata=doc.metadata
            )
        
        return {
            "status": "success",
            "message": f"Added {len(documents)} documents"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "${this.port}"))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
`;

    const scriptPath = path.join(__dirname, '../../../temp/embedded_langflow_server.py');
    await fs.ensureDir(path.dirname(scriptPath));
    await fs.writeFile(scriptPath, serverScript);
    return scriptPath;
  }

  /**
   * Start the embedded LangFlow server
   */
  async start(): Promise<boolean> {
    try {
      // Check Python availability
      const pythonAvailable = await this.checkPython();
      if (!pythonAvailable) {
        console.error('❌ Python not found. Please install Python 3.8+');
        return false;
      }

      // Install dependencies if needed
      const dependenciesInstalled = await this.installDependencies();
      if (!dependenciesInstalled) {
        return false;
      }

      // Load LangFlow configuration
      await this.loadLangFlowConfig();

      // Create server script
      const scriptPath = await this.createServerScript();

      console.log(`🚀 Starting embedded LangFlow server on port ${this.port}...`);

      // Start Python server
      this.process = spawn(this.pythonPath, [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PORT: this.port.toString(),
          PYTHONPATH: path.dirname(scriptPath)
        }
      });

      // Handle output
      this.process.stdout?.on('data', (data) => {
        console.log(`[LangFlow] ${data.toString().trim()}`);
      });

      this.process.stderr?.on('data', (data) => {
        console.error(`[LangFlow Error] ${data.toString().trim()}`);
      });

      this.process.on('error', (error) => {
        console.error('❌ Failed to start LangFlow server:', error);
      });

      // Wait for server to be ready
      const isReady = await this.waitForReady();
      if (isReady) {
        console.log('✅ Embedded LangFlow server is ready');
        return true;
      } else {
        console.error('❌ LangFlow server failed to start');
        return false;
      }

    } catch (error) {
      console.error('❌ Error starting embedded LangFlow:', error);
      return false;
    }
  }

  /**
   * Wait for server to be ready
   */
  private async waitForReady(maxRetries: number = 15): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await axios.get(`http://localhost:${this.port}/health`, {
          timeout: 2000
        });
        
        if (response.data.status === 'healthy') {
          return true;
        }
      } catch (error) {
        // Server not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return false;
  }

  /**
   * Stop the server
   */
  async stop(cleanup: boolean = false): Promise<void> {
    if (this.process) {
      console.log('🛑 Stopping embedded LangFlow server...');
      this.process.kill('SIGTERM');
      
      // Wait for process to exit
      await new Promise<void>((resolve) => {
        this.process?.on('exit', () => {
          console.log('✅ LangFlow server stopped');
          resolve();
        });
        
        // Force kill after 5 seconds
        setTimeout(() => {
          if (this.process && !this.process.killed) {
            this.process.kill('SIGKILL');
            resolve();
          }
        }, 5000);
      });
      
      this.process = undefined;
    }

    // Cleanup virtual environment if requested
    if (cleanup) {
      await this.cleanupEnvironment();
    }
  }

  /**
   * Cleanup Python environment and temporary files
   */
  async cleanupEnvironment(): Promise<void> {
    try {
      console.log('🧹 Cleaning up Python environment...');
      
      const venvPath = path.join(__dirname, '../../../temp/codey-venv');
      const tempDir = path.join(__dirname, '../../../temp');
      
      // Remove virtual environment
      if (await fs.pathExists(venvPath)) {
        await fs.remove(venvPath);
        console.log('✅ Removed virtual environment');
      }
      
      // Remove temporary Python script
      const scriptPath = path.join(tempDir, 'embedded_langflow_server.py');
      if (await fs.pathExists(scriptPath)) {
        await fs.remove(scriptPath);
        console.log('✅ Removed temporary server script');
      }
      
      // Remove temp directory if empty
      try {
        const tempContents = await fs.readdir(tempDir);
        if (tempContents.length === 0) {
          await fs.remove(tempDir);
          console.log('✅ Removed temporary directory');
        }
      } catch {
        // Directory doesn't exist or not empty, that's fine
      }
      
    } catch (error) {
      console.warn('⚠️  Error during cleanup:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Get size of virtual environment
   */
  async getEnvironmentSize(): Promise<string> {
    try {
      const venvPath = path.join(__dirname, '../../../temp/codey-venv');
      if (!await fs.pathExists(venvPath)) {
        return '0 MB';
      }
      
      // Simple size calculation (not perfect but gives an idea)
      const { spawn } = require('child_process');
      return new Promise((resolve) => {
        const proc = spawn('du', ['-sh', venvPath], { stdio: 'pipe' });
        let output = '';
        
        proc.stdout?.on('data', (data) => {
          output += data.toString();
        });
        
        proc.on('close', () => {
          const size = output.split('\t')[0] || '~100 MB';
          resolve(size);
        });
        
        proc.on('error', () => {
          resolve('~100 MB');
        });
      });
    } catch {
      return '~100 MB';
    }
  }

  /**
   * Check if server is running
   */
  async isRunning(): Promise<boolean> {
    try {
      const response = await axios.get(`http://localhost:${this.port}/health`, {
        timeout: 1000
      });
      return response.data.status === 'healthy';
    } catch {
      return false;
    }
  }

  /**
   * Get server URL
   */
  getUrl(): string {
    return `http://localhost:${this.port}`;
  }
}