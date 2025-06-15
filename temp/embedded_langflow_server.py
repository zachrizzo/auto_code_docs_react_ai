
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
        search_results = vector_db.search(request.message, top_k=5)
        
        # Log search results for debugging
        print(f"Found {len(search_results)} search results for query: {request.message}")
        for i, result in enumerate(search_results):
            print(f"  Result {i+1}: {result.get('doc_id', 'N/A')} (score: {result.get('score', 'N/A')})")
        
        # Simple response generation (can be enhanced with actual LangFlow)
        context_text = ""
        if search_results:
            context_text = "\n".join([r['content'][:200] + "..." for r in search_results[:3]])
        
        # Generate response using Ollama if available
        response_text = await generate_ollama_response(request.message, context_text, search_results)
        
        session_id = request.session_id or f"session_{datetime.now().timestamp()}"
        
        return ChatResponse(
            response=response_text,
            session_id=session_id,
            metadata={"search_results_count": len(search_results)}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def generate_ollama_response(query: str, context: str, search_results: list = None) -> str:
    try:
        ollama_url = "http://localhost:11434"
        
        # Enhanced prompt that includes instructions for markdown links
        prompt = f"""Based on the following code analysis context, please answer the user's question.

IMPORTANT: When mentioning specific functions, components, or classes by name in your response, try to provide clickable links to help users navigate to the relevant code. Use this markdown link format:
- For functions: [functionName](/functions/function_slug)
- For components: [ComponentName](/components/component_slug)  
- For classes: [ClassName](/classes/class_slug)

The system will automatically enhance your response with proper links based on the context provided.

Context:
{context}

Question: {query}

Please provide a helpful and accurate response. Focus on being informative and include specific code element names when relevant."""

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
                ai_response = data.get("message", {}).get("content", "I couldn't generate a response.")
                
                # Post-process the response to add links if the AI didn't include them
                enhanced_response = enhance_response_with_links(ai_response, search_results or [])
                return enhanced_response
            else:
                return f"Based on the documentation: {context[:300]}... I can help answer questions about this code."
                
    except Exception as e:
        print(f"Ollama error: {e}")
        return f"I found relevant documentation: {context[:300]}... Please let me know if you need more specific information."

def enhance_response_with_links(response: str, search_results: list) -> str:
    """
    Enhance AI response by adding clickable links to mentioned functions/components
    """
    try:
        if not search_results:
            print("No search results provided for link enhancement")
            return response
            
        print(f"Enhancing response with links from {len(search_results)} search results")
            
        # Create a mapping of function/component names to their slugs and types
        name_to_info = {}
        for result in search_results:
            if 'metadata' in result and result['metadata']:
                metadata = result['metadata']
                name = metadata.get('name') or metadata.get('methodName') or metadata.get('componentName')
                doc_type = metadata.get('type', 'function')
                doc_id = result.get('doc_id', '')
                
                print(f"Processing result: {doc_id}, name: {name}, type: {doc_type}")
                
                if name:
                    # Use the slug from metadata if available, otherwise generate one
                    slug = metadata.get('slug') or metadata.get('componentSlug')
                    if not slug:
                        # Generate slug from the docId or create one
                        if '_' in doc_id:
                            slug = doc_id.split('_', 1)[1]  # Remove type prefix
                        else:
                            slug = name.lower().replace(' ', '-')
                    
                    print(f"  Generated slug: {slug} for {name}")
                    
                    name_to_info[name] = {
                        'slug': slug,
                        'type': doc_type,
                        'path': metadata.get('filePath', '')
                    }
        
        # Replace function/component names with markdown links
        enhanced_response = response
        for name, info in name_to_info.items():
            # Skip very short names to avoid false matches
            if len(name) < 3:
                continue
                
            route_prefix = "functions"
            if info['type'] == 'component':
                route_prefix = "components"
            elif info['type'] == 'class':
                route_prefix = "classes"
            elif info['type'] == 'method':
                route_prefix = "functions"  # Methods are viewed as functions
            
            # Create the markdown link
            link = f"[{name}](/{route_prefix}/{info['slug']})"
            
            # Replace mentions of the name (avoid replacing if already in a link)
            import re
            # Only replace if not already part of a markdown link
            pattern = f"\b{re.escape(name)}\b(?![^\[]*\])"
            if re.search(pattern, enhanced_response):
                enhanced_response = re.sub(pattern, link, enhanced_response, count=1)
                print(f"  Replaced '{name}' with link: {link}")
        
        print(f"Link enhancement complete. Found {len(name_to_info)} potential links")
        return enhanced_response
        
    except Exception as e:
        print(f"Error enhancing response with links: {e}")
        return response

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
