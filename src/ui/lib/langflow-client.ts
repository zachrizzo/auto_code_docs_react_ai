import axios, { AxiosInstance } from 'axios';

export interface LangFlowChatRequest {
  message: string;
  context?: Record<string, any>;
  sessionId?: string;
  model?: string;
}

export interface LangFlowChatResponse {
  response: string;
  sessionId: string;
  metadata?: Record<string, any>;
}

export interface LangFlowDocument {
  docId: string;
  content: string;
  metadata: Record<string, any>;
}

export interface LangFlowSearchResult {
  docId: string;
  content: string;
  metadata: Record<string, any>;
  score: number;
}

export class LangFlowClient {
  private client: AxiosInstance;
  public readonly baseUrl: string;
  
  constructor(baseUrl: string = 'http://localhost:6271') {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 120000, // Increased to 2 minutes
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  
  /**
   * Check if LangFlow server is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'healthy';
    } catch {
      return false;
    }
  }
  
  /**
   * Send a chat message to LangFlow
   */
  async chat(request: LangFlowChatRequest): Promise<LangFlowChatResponse> {
    try {
      const response = await this.client.post<LangFlowChatResponse>('/chat', request);
      return response.data;
    } catch (error) {
      console.error('LangFlow chat error:', error);
      throw new Error('Failed to get response from LangFlow');
    }
  }
  
  /**
   * Add a document to the vector database
   */
  async addDocument(document: LangFlowDocument): Promise<void> {
    try {
      await this.client.post('/documents/add', {
        doc_id: document.docId,
        content: document.content,
        metadata: document.metadata
      });
    } catch (error) {
      console.error('Failed to add document:', error);
      throw error;
    }
  }
  
  /**
   * Add multiple documents in batch
   */
  async addDocumentsBatch(documents: LangFlowDocument[]): Promise<void> {
    try {
      await this.client.post('/documents/batch', documents.map(doc => ({
        doc_id: doc.docId,
        content: doc.content,
        metadata: doc.metadata
      })));
    } catch (error) {
      console.error('Failed to add documents batch:', error);
      throw error;
    }
  }
  
  /**
   * Search for similar documents
   */
  async searchDocuments(query: string, topK: number = 5): Promise<LangFlowSearchResult[]> {
    try {
      const response = await this.client.post('/documents/search', {
        query,
        top_k: topK
      });
      return response.data.results;
    } catch (error) {
      console.error('Failed to search documents:', error);
      throw error;
    }
  }
  
  /**
   * Update the LangFlow configuration
   */
  async updateFlow(flowConfig: any): Promise<void> {
    try {
      await this.client.post('/flow/update', {
        flow_config: flowConfig
      });
    } catch (error) {
      console.error('Failed to update flow:', error);
      throw error;
    }
  }
  
  /**
   * Get current LangFlow configuration
   */
  async getFlowConfig(): Promise<any> {
    try {
      const response = await this.client.get('/flow/config');
      return response.data;
    } catch (error) {
      console.error('Failed to get flow config:', error);
      throw error;
    }
  }
}

// Singleton instance
let langflowClient: LangFlowClient | null = null;

export function getLangFlowClient(baseUrl?: string): LangFlowClient {
  if (!langflowClient || (baseUrl && langflowClient.baseUrl !== baseUrl)) {
    langflowClient = new LangFlowClient(baseUrl);
  }
  return langflowClient;
}