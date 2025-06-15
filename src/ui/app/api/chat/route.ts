import { NextRequest, NextResponse } from "next/server";
import { CodebaseChatService } from "../../../../ai/chat/chat-service";
import type { ChatMessage } from "../../../../ai/shared/ai.types";
import path from "path";
import fs from "fs-extra";
import axios from "axios";
import { getLangFlowClient } from "../../../lib/langflow-client";

// Read components from docs-data directory
async function getComponentDefinitions() {
  try {
    console.log("Loading component definitions for vector search...");
    
    // Try multiple possible locations for docs-data
    const possiblePaths = [
      path.join(process.cwd(), "public/docs-data/docs-data"),  // Symlinked path
      path.join(process.cwd(), "public/docs-data"),
      path.join(process.cwd(), "docs-data"),
      path.join(process.cwd(), "src/ui/docs-data"),
      path.join(process.cwd(), "test-docs-project/documentation/docs-data"),
      path.join(process.cwd(), "../test-docs-project/documentation/docs-data")
    ];
    
    let docsDataDir = "";
    let indexPath = "";
    
    // Find the first path that exists and has a component-index.json file
    for (const possiblePath of possiblePaths) {
      const possibleIndexPath = path.join(possiblePath, "component-index.json");
      if (await fs.exists(possibleIndexPath)) {
        docsDataDir = possiblePath;
        indexPath = possibleIndexPath;
        console.log(`Found component data in: ${docsDataDir}`);
        break;
      }
    }
    
    if (!indexPath) {
      // Try looking for code-index.json as an alternative
      for (const possiblePath of possiblePaths) {
        const possibleIndexPath = path.join(possiblePath, "code-index.json");
        if (await fs.exists(possibleIndexPath)) {
          docsDataDir = possiblePath;
          indexPath = possibleIndexPath;
          console.log(`Found code-index.json in: ${docsDataDir}`);
          break;
        }
      }
    }
    
    if (!indexPath) {
      console.error("Component index file not found in any of the expected locations");
      console.error("This will cause vector search to fail. Make sure docs-data directory exists.");
      return [];
    }

    // Read the index file and determine its type
    const indexData = await fs.readJson(indexPath);
    const isCodeIndex = indexPath.includes('code-index.json');
    const components = [];
    
    if (isCodeIndex) {
      // Handle code-index.json format
      console.log(`Found code index with ${Object.keys(indexData).length} entries`);
      
      // Convert code index format to component format
      for (const [filePath, fileData] of Object.entries(indexData)) {
        if (typeof fileData !== 'object' || !fileData) continue;
        
        const fileComponents = fileData as any;
        if (!Array.isArray(fileComponents.components)) continue;
        
        for (const component of fileComponents.components) {
          if (!component.name) continue;
          
          // Create a component definition with methods
          const componentDef = {
            name: component.name,
            filePath: filePath,
            methods: []
          };
          
          // Add methods if they exist
          if (Array.isArray(component.methods)) {
            componentDef.methods = component.methods.map((method: any) => ({
              name: method.name || 'unknown',
              code: method.code || '',
              description: method.description || '',
              params: method.params || [],
              returnType: method.returnType || 'void'
            }));
          }
          
          if (componentDef.methods.length > 0) {
            console.log(`Component ${componentDef.name} has ${componentDef.methods.length} methods`);
            components.push(componentDef);
          } else {
            console.log(`Component ${componentDef.name} has no methods`);
          }
        }
      }
    } else {
      // Handle component-index.json format
      const componentIndex = indexData;
      console.log(`Found ${componentIndex.length} components in index`);
      
      // Load each component's full data
      for (const component of componentIndex) {
        try {
          const componentPath = path.join(docsDataDir, `${component.slug}.json`);
          if (await fs.exists(componentPath)) {
            const componentData = await fs.readJson(componentPath);
            
            // Ensure the component has methods for vector search
            if (componentData.methods && componentData.methods.length > 0) {
              console.log(`Component ${componentData.name} has ${componentData.methods.length} methods`);
            } else {
              console.log(`Component ${componentData.name} has no methods`);
            }
            
            components.push(componentData);
          } else {
            console.warn(`Component data file not found: ${componentPath}`);
          }
        } catch (componentError) {
          console.error(`Error loading component ${component.slug}:`, componentError);
        }
      }
    }

    console.log(`Successfully loaded ${components.length} components with their methods`);
    return components;
  } catch (error) {
    console.error("Error loading component definitions:", error);
    return [];
  }
}

// Load the saved vector database
async function loadVectorDatabase() {
  try {
    console.log("Loading saved vector database...");
    
    // Try multiple possible locations for the vector database
    const possiblePaths = [
      path.join(process.cwd(), "public/docs-data/docs-data/vector-database.json"),  // Symlinked path
      path.join(process.cwd(), "public/docs-data/vector-database.json"),
      path.join(process.cwd(), "docs-data/vector-database.json"),
      path.join(process.cwd(), "src/ui/public/docs-data/vector-database.json"),
      path.join(process.cwd(), "src/ui/docs-data/vector-database.json"),
      path.join(process.cwd(), "test-docs-project/documentation/docs-data/vector-database.json"),
      path.join(process.cwd(), "../test-docs-project/documentation/docs-data/vector-database.json")
    ];
    
    for (const possiblePath of possiblePaths) {
      if (await fs.exists(possiblePath)) {
        console.log(`Found vector database at: ${possiblePath}`);
        const vectorDb = await fs.readJson(possiblePath);
        console.log(`Loaded vector database with ${vectorDb.length} entries`);
        return vectorDb;
      }
    }
    
    console.warn("Vector database file not found in any of the expected locations");
    return null;
  } catch (error) {
    console.error("Error loading vector database:", error);
    return null;
  }
}

// Initialize the chat service (lazy loading)
let chatService: CodebaseChatService | null = null;

async function getChatService() {
  if (!chatService) {
    console.log("=== CREATING NEW CHAT SERVICE INSTANCE ===");
    
    // Load the saved vector database FIRST
    const savedVectorDb = await loadVectorDatabase();
    if (!savedVectorDb || savedVectorDb.length === 0) {
      console.warn("WARNING: No saved vector database found. Chat will work but without vector search.");
      // Don't throw error, just continue with empty database
    }
    
    const components = await getComponentDefinitions();
    console.log(`Loaded ${components.length} component definitions`);
    
    // Log details about loaded components
    let totalMethods = 0;
    components.forEach(comp => {
      if (comp.methods && comp.methods.length > 0) {
        totalMethods += comp.methods.length;
      }
    });
    console.log(`Total methods across all components: ${totalMethods}`);
    
    const config = {
      useOllama: true,
      ollamaUrl: process.env.OLLAMA_URL || "http://localhost:11434",
      ollamaModel: process.env.OLLAMA_MODEL || "nomic-embed-text:latest",
      ollamaEmbeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text:latest",
      chatModel: process.env.CHAT_MODEL || "gemma3:4b",
      similarityThreshold: process.env.SIMILARITY_THRESHOLD ? parseFloat(process.env.SIMILARITY_THRESHOLD) : 0.2
    };
    
    console.log("Chat service configuration:", {
      ollamaUrl: config.ollamaUrl,
      embeddingModel: config.ollamaEmbeddingModel,
      chatModel: config.chatModel,
      similarityThreshold: config.similarityThreshold
    });
    
    // Create service but skip initialization since we'll import the vector DB
    chatService = new CodebaseChatService(components, config);
    
    // Import the saved vector database immediately (if available)
    if (savedVectorDb && savedVectorDb.length > 0) {
      console.log(`Importing saved vector database with ${savedVectorDb.length} entries...`);
      chatService.vectorService.importVectorDatabase(JSON.stringify(savedVectorDb));
    } else {
      console.log("No vector database to import - chat will work without similarity search");
    }
    
    // Verify the import worked
    const vectorDbString = chatService.vectorService.exportVectorDatabase();
    const importedDb = JSON.parse(vectorDbString);
    console.log(`Vector database after import: ${importedDb.length} entries`);
    
    // Verify database integrity (only if we have data)
    if (importedDb.length > 0) {
      const isValid = chatService.verifyVectorDatabase();
      if (!isValid) {
        console.error("WARNING: Vector database contains invalid entries!");
      }
    }
    
    // Test Ollama connectivity
    try {
      const testResponse = await axios.get(`${config.ollamaUrl}/api/tags`, { timeout: 5000 });
      console.log("Ollama server is running. Available models:", testResponse.data.models?.map((m: any) => m.name));
      
      // Check if the embedding model is available
      const hasEmbeddingModel = testResponse.data.models?.some((m: any) => m.name === config.ollamaEmbeddingModel);
      if (!hasEmbeddingModel) {
        console.warn(`WARNING: Embedding model '${config.ollamaEmbeddingModel}' not found in Ollama. Run: ollama pull ${config.ollamaEmbeddingModel}`);
      }
    } catch (error) {
      console.error("WARNING: Cannot connect to Ollama server. Vector search will fail!");
    }
    
    console.log("=== CHAT SERVICE INITIALIZATION COMPLETE ===");
  }

  return chatService;
}

// Check if LangFlow is enabled and available
async function isLangFlowEnabled(): Promise<boolean> {
  const useLangFlow = process.env.USE_LANGFLOW === 'true';
  if (!useLangFlow) return false;
  
  try {
    const client = getLangFlowClient(process.env.LANGFLOW_URL);
    return await client.healthCheck();
  } catch {
    return false;
  }
}

// Initialize LangFlow with documentation data
async function initializeLangFlowWithDocs() {
  const client = getLangFlowClient(process.env.LANGFLOW_URL);
  const components = await getComponentDefinitions();
  
  console.log(`Initializing LangFlow with ${components.length} components...`);
  
  // Add all components to LangFlow vector database
  const documents = [];
  for (const component of components) {
    // Add component itself
    documents.push({
      docId: `component_${component.name}`,
      content: `Component: ${component.name}\nFile: ${component.filePath}\nCode: ${component.code || ''}\nDescription: ${component.description || ''}`,
      metadata: {
        type: 'component',
        name: component.name,
        filePath: component.filePath
      }
    });
    
    // Add each method
    if (component.methods && Array.isArray(component.methods)) {
      for (const method of component.methods) {
        documents.push({
          docId: `method_${component.name}_${method.name}`,
          content: `Method: ${method.name} in ${component.name}\nCode: ${method.code || ''}\nDescription: ${method.description || ''}\nParameters: ${JSON.stringify(method.params || [])}\nReturn Type: ${method.returnType || 'void'}`,
          metadata: {
            type: 'method',
            componentName: component.name,
            methodName: method.name,
            filePath: component.filePath
          }
        });
      }
    }
  }
  
  // Add documents in batches
  if (documents.length > 0) {
    await client.addDocumentsBatch(documents);
    console.log(`Added ${documents.length} documents to LangFlow vector database`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { history, query } = await request.json();
    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }
    
    console.log(`\n=== PROCESSING CHAT REQUEST ===`);
    console.log(`User query: "${query}"`);
    console.log(`History length: ${history?.length || 0}`);
    
    // Check if LangFlow is available
    const langFlowEnabled = await isLangFlowEnabled();
    console.log(`LangFlow enabled: ${langFlowEnabled}`);
    
    if (langFlowEnabled) {
      console.log("Using LangFlow for enhanced AI chat...");
      
      try {
        const client = getLangFlowClient(process.env.LANGFLOW_URL);
        
        // Initialize LangFlow with docs if this is the first request
        let initialized = (global as any).langflowInitialized || false;
        if (!initialized) {
          await initializeLangFlowWithDocs();
          (global as any).langflowInitialized = true;
        }
        
        // Convert history to chat context
        const context = {
          history: history || [],
          timestamp: new Date().toISOString()
        };
        
        // Send to LangFlow
        const langFlowResponse = await client.chat({
          message: query,
          context,
          sessionId: `session_${Date.now()}`
        });
        
        console.log(`LangFlow response: ${langFlowResponse.response.length} characters`);
        
        return NextResponse.json({ 
          response: langFlowResponse.response,
          searchResults: [], // LangFlow handles search internally
          source: 'langflow',
          metadata: langFlowResponse.metadata
        });
        
      } catch (langFlowError) {
        console.error("LangFlow error, falling back to legacy chat:", langFlowError);
        // Fall through to legacy chat service
      }
    }
    
    // Legacy chat service fallback
    console.log("Using legacy chat service...");
    const service = await getChatService();
    
    // Verify vector database is loaded
    const vectorDbString = service.vectorService.exportVectorDatabase();
    const vectorDb = JSON.parse(vectorDbString);
    console.log(`Vector database status: ${vectorDb.length} entries loaded`);
    
    if (vectorDb.length === 0) {
      console.warn("WARNING: Vector database is empty - similarity search disabled");
    }
    
    // Use the chat service directly - it handles vector search internally
    console.log("Calling legacy chat service...");
    const { response, searchResults } = await service.chat(history || [], query);
    
    console.log(`Chat service returned ${searchResults.length} search results`);
    console.log(`Response length: ${response.length} characters`);
    
    // Log search results for debugging
    if (searchResults.length > 0) {
      console.log("Search results summary:");
      searchResults.forEach((result, idx) => {
        console.log(`  ${idx + 1}. ${result.componentName}.${result.methodName || 'N/A'} (similarity: ${result.similarity?.toFixed(3) || 'N/A'})`);
      });
    } else {
      console.warn("No search results found for the query");
    }
    
    console.log("=== CHAT REQUEST COMPLETE ===\n");
    
    return NextResponse.json({ response, searchResults, source: 'legacy' });
  } catch (error: any) {
    console.error("Error processing chat request:", error.message || error);
    console.error("Stack trace:", error.stack);
    
    return NextResponse.json({ 
      error: "Failed to process request",
      details: error.message || "Unknown error"
    }, { status: 500 });
  }
}
