
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
            context_text = "\n".join([r['content'][:200] + "..." for r in search_results[:2]])
        
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
        ollama_url = "http://localhost:11434"
        
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
    port = int(os.environ.get("PORT", "6271"))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
