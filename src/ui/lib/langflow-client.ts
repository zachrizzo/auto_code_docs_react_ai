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
   * Send a chat message with streaming response
   */
  async *chatStream(request: LangFlowChatRequest): AsyncGenerator<string, void, unknown> {
    try {
      const url = `${this.baseUrl}/chat?stream=true`;
      console.log('LangFlow chatStream: Making request to:', url); // Debug log
      console.log('LangFlow chatStream: Request payload:', request); // Debug log
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      console.log('LangFlow chatStream: Response status:', response.status); // Debug log
      console.log('LangFlow chatStream: Response headers:', {
        'content-type': response.headers.get('content-type'),
        'content-length': response.headers.get('content-length'),
        'server': response.headers.get('server'),
        'date': response.headers.get('date')
      }); // Debug log

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        // Handle non-streaming response by yielding the full response as chunks
        const jsonResponse = await response.json();
        console.log('LangFlow returned JSON instead of stream. Converting to streaming format:', JSON.stringify(jsonResponse, null, 2));
        
        if (jsonResponse.response) {
          // Split the response into chunks to simulate streaming
          const text = jsonResponse.response;
          const words = text.split(' ');
          
          for (let i = 0; i < words.length; i++) {
            const chunk = i === 0 ? words[i] : ' ' + words[i];
            yield chunk;
            // Add small delay to simulate streaming
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            console.log('LangFlow chatStream: Raw SSE line:', line); // Debug log
            try {
              const data = JSON.parse(line.slice(6));
              console.log('LangFlow chatStream: Parsed SSE data:', data); // Debug log
              if (data.event === 'token' && data.data && data.data.chunk) {
                console.log('LangFlow chatStream: Yielding chunk:', data.data.chunk); // Debug log
                yield data.data.chunk;
              } else if (data.event === 'error') {
                throw new Error(data.data.error);
              } else if (data.event === 'end') {
                console.log('LangFlow chatStream: Stream ended'); // Debug log
                return;
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', line);
            }
          }
        }
      }
    } catch (error) {
      console.error('LangFlow streaming error:', error);
      throw new Error('Failed to stream response from LangFlow');
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