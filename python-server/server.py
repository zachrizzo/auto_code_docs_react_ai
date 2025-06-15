from fastapi import FastAPI, HTTPException, File, UploadFile, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
import json
import logging
from datetime import datetime
import asyncio
from contextlib import asynccontextmanager
import copy

# LangFlow imports
from langflow import load_flow_from_json
from langflow.services.getters import get_run_manager
from langflow.services.deps import get_session

# Vector DB and AI
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
import redis
import pickle

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables
flow_manager = None
vector_db = None
embedder = None
redis_client = None

# Models
class ChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None
    session_id: Optional[str] = None
    model: Optional[str] = None

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
    filters: Optional[Dict[str, Any]] = None

class FlowUpdateRequest(BaseModel):
    flow_config: Dict[str, Any]

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global flow_manager, vector_db, embedder, redis_client
    
    try:
        # Initialize Redis
        redis_client = redis.Redis(host='redis', port=6379, decode_responses=True)
        logger.info("Connected to Redis")
        
        # Initialize embedder
        embedder = SentenceTransformer('all-MiniLM-L6-v2')
        logger.info("Initialized embedder model")
        
        # Load LangFlow configuration
        config_path = os.getenv('LANGFLOW_CONFIG_PATH', '/app/langflow-config.json')
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                flow_config = json.load(f)
            flow_manager = FlowManager(flow_config)
            await flow_manager.initialize()
            logger.info("LangFlow initialized successfully")
        else:
            logger.warning("LangFlow config not found, running without flow")
        
        # Initialize or load vector DB
        vector_db = VectorDBManager(embedder)
        await vector_db.initialize()
        logger.info("Vector DB initialized")
        
    except Exception as e:
        logger.error(f"Startup error: {e}")
    
    yield
    
    # Shutdown
    if redis_client:
        redis_client.close()
    logger.info("Server shutdown complete")

app = FastAPI(title="Codey LangFlow Server", version="0.1.0", lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class FlowManager:
    def __init__(self, flow_config: Dict[str, Any]):
        self.flow_config = flow_config
        self.flow = None
        self.run_manager = None
        
    async def initialize(self):
        """Initialize LangFlow with the provided configuration"""
        try:
            # Load the flow
            self.flow = load_flow_from_json(self.flow_config)
            self.run_manager = get_run_manager()
            logger.info("LangFlow initialized with custom flow")
        except Exception as e:
            logger.error(f"Failed to initialize LangFlow: {e}")
            raise
    
    async def run_flow(self, input_data: Dict[str, Any], session_id: str, selected_model: Optional[str] = None) -> Dict[str, Any]:
        """Run the LangFlow with given input, dynamically changing the model if specified."""
        try:
            flow_to_run = self.flow
            
            # If a model is selected, modify the flow configuration in memory
            if selected_model:
                logger.info(f"Switching to model: {selected_model}")
                
                # Deep copy the original config to avoid modifying it globally
                temp_config = copy.deepcopy(self.flow_config)
                
                # Debug: Print the structure of nodes
                logger.info(f"Number of nodes in config: {len(temp_config.get('data', {}).get('nodes', []))}")
                
                # Find the OllamaModel node and update its model_name
                model_node_updated = False
                for node in temp_config.get("data", {}).get("nodes", []):
                    node_id = node.get("data", {}).get("id", "")
                    logger.info(f"Checking node: {node_id}")
                    
                    if node_id.startswith("OllamaModel"):
                        logger.info(f"Found OllamaModel node: {node_id}")
                        
                        # Debug: Print current model_name value
                        current_model = node.get("data", {}).get("node", {}).get("template", {}).get("model_name", {}).get("value", "")
                        logger.info(f"Current model value: {current_model}")
                        
                        # Update model_name
                        node["data"]["node"]["template"]["model_name"]["value"] = selected_model
                        model_node_updated = True
                        
                        # Verify the update
                        new_model = node.get("data", {}).get("node", {}).get("template", {}).get("model_name", {}).get("value", "")
                        logger.info(f"Updated node {node_id} from {current_model} to {new_model}")
                        break
                
                if not model_node_updated:
                    logger.warning("Could not find OllamaModel node to update.")
                    # Debug: Print all node IDs
                    all_node_ids = [node.get("data", {}).get("id", "") for node in temp_config.get("data", {}).get("nodes", [])]
                    logger.warning(f"Available node IDs: {all_node_ids}")
                else:
                    # Load the modified flow
                    logger.info("Loading modified flow configuration...")
                    flow_to_run = load_flow_from_json(temp_config)
                    logger.info("Successfully loaded modified flow")

            # Execute the flow
            logger.info(f"Executing flow with session_id: {session_id}")
            results = await self.run_manager.run(
                flow=flow_to_run,
                input_value=input_data,
                session_id=session_id
            )
            logger.info(f"Flow execution completed with {len(results) if results else 0} results")
            return results
        except Exception as e:
            logger.error(f"Flow execution error: {e}")
            raise

class VectorDBManager:
    def __init__(self, embedder):
        self.embedder = embedder
        self.index = None
        self.metadata = {}
        self.db_path = os.getenv('VECTOR_DB_PATH', '/app/data/vector_db')
        
    async def initialize(self):
        """Initialize or load existing vector database"""
        os.makedirs(self.db_path, exist_ok=True)
        index_path = os.path.join(self.db_path, 'faiss.index')
        metadata_path = os.path.join(self.db_path, 'metadata.pkl')
        
        if os.path.exists(index_path) and os.path.exists(metadata_path):
            # Load existing index
            self.index = faiss.read_index(index_path)
            with open(metadata_path, 'rb') as f:
                self.metadata = pickle.load(f)
            logger.info(f"Loaded existing vector DB with {self.index.ntotal} vectors")
        else:
            # Create new index
            dimension = 384  # all-MiniLM-L6-v2 dimension
            self.index = faiss.IndexFlatL2(dimension)
            logger.info("Created new vector DB")
    
    async def add_document(self, doc_id: str, content: str, metadata: Dict[str, Any]):
        """Add a document to the vector database"""
        # Generate embedding
        embedding = self.embedder.encode([content])
        
        # Add to index
        self.index.add(embedding)
        
        # Store metadata
        idx = self.index.ntotal - 1
        self.metadata[idx] = {
            'doc_id': doc_id,
            'content': content,
            'metadata': metadata,
            'timestamp': datetime.now().isoformat()
        }
        
        # Save to disk
        await self.save()
        
    async def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Search for similar documents"""
        if self.index.ntotal == 0:
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
    
    async def save(self):
        """Save index and metadata to disk"""
        index_path = os.path.join(self.db_path, 'faiss.index')
        metadata_path = os.path.join(self.db_path, 'metadata.pkl')
        
        faiss.write_index(self.index, index_path)
        with open(metadata_path, 'wb') as f:
            pickle.dump(self.metadata, f)

# API Endpoints

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "langflow": flow_manager is not None,
        "vector_db": vector_db is not None,
        "redis": redis_client is not None and redis_client.ping()
    }

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Handle chat requests"""
    if not flow_manager:
        raise HTTPException(status_code=503, detail="LangFlow not initialized")
    
    try:
        session_id = request.session_id or f"session_{datetime.now().timestamp()}"
        
        # Run the flow with the user's message and selected model
        results = await flow_manager.run_flow(
            input_data={'input_value': request.message}, 
            session_id=session_id,
            selected_model=request.model
        )
        
        # Extract the response from the last result
        # This may need adjustment based on your specific flow output
        final_result = results[-1]
        response_data = final_result.get('data', {}).get('result')

        if not response_data:
            logger.error(f"Unexpected flow result format: {final_result}")
            raise HTTPException(status_code=500, detail="Invalid response format from flow")
        
        return ChatResponse(
            response=response_data.get('message', 'No response found.'),
            session_id=session_id,
            metadata=response_data.get('metadata')
        )
        
    except Exception as e:
        logger.error(f"Chat processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/documents/add")
async def add_document(request: DocumentRequest):
    """Add a document to the vector database"""
    try:
        if not vector_db:
            raise HTTPException(status_code=503, detail="Vector DB not initialized")
        
        await vector_db.add_document(
            doc_id=request.doc_id,
            content=request.content,
            metadata=request.metadata
        )
        
        return {"status": "success", "doc_id": request.doc_id}
        
    except Exception as e:
        logger.error(f"Document add error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/documents/search")
async def search_documents(request: SearchRequest):
    """Search for similar documents"""
    try:
        if not vector_db:
            raise HTTPException(status_code=503, detail="Vector DB not initialized")
        
        results = await vector_db.search(request.query, request.top_k)
        
        return {"results": results, "count": len(results)}
        
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/flow/update")
async def update_flow(request: FlowUpdateRequest):
    """Update the LangFlow configuration"""
    try:
        global flow_manager
        
        # Save new config
        config_path = os.getenv('LANGFLOW_CONFIG_PATH', '/app/langflow-config.json')
        with open(config_path, 'w') as f:
            json.dump(request.flow_config, f, indent=2)
        
        # Reinitialize flow manager
        flow_manager = FlowManager(request.flow_config)
        await flow_manager.initialize()
        
        return {"status": "success", "message": "Flow updated successfully"}
        
    except Exception as e:
        logger.error(f"Flow update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/flow/config")
async def get_flow_config():
    """Get current LangFlow configuration"""
    if not flow_manager:
        raise HTTPException(status_code=503, detail="LangFlow not initialized")
    
    return flow_manager.flow_config

@app.post("/documents/batch")
async def batch_add_documents(documents: List[DocumentRequest], background_tasks: BackgroundTasks):
    """Add multiple documents in batch"""
    try:
        if not vector_db:
            raise HTTPException(status_code=503, detail="Vector DB not initialized")
        
        # Add task to background
        background_tasks.add_task(process_batch_documents, documents)
        
        return {
            "status": "processing",
            "message": f"Processing {len(documents)} documents in background"
        }
        
    except Exception as e:
        logger.error(f"Batch add error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def process_batch_documents(documents: List[DocumentRequest]):
    """Process documents in background"""
    for doc in documents:
        try:
            await vector_db.add_document(
                doc_id=doc.doc_id,
                content=doc.content,
                metadata=doc.metadata
            )
        except Exception as e:
            logger.error(f"Failed to process document {doc.doc_id}: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=6271)