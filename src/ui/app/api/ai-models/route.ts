import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';

// Constants
const OLLAMA_URL = process.env.OLLAMA_HOST || 'http://localhost:11434';
const LANGFLOW_CONFIG_PATH = path.join(process.cwd(), 'langflow-config.json');

// Helper to check if a model has the "completion" capability
async function hasCompletionCapability(modelName: string): Promise<boolean> {
  try {
    const response = await axios.post(`${OLLAMA_URL}/api/show`, { name: modelName });
    const details = response.data;
    // Assuming a model is a completion model if it's not explicitly an embedding model.
    // A more robust check might be needed if Ollama provides explicit capability tags.
    const isEmbeddingModel = details.details?.family?.toLowerCase().includes('embed');
    return !isEmbeddingModel;
  } catch (error) {
    console.warn(`Could not retrieve details for model: ${modelName}`, error);
    // Assume it's a completion model if the check fails, to be permissive.
    return true;
  }
}

export async function GET() {
  try {
    // 1. Fetch available models from Ollama
    const response = await axios.get(`${OLLAMA_URL}/api/tags`);
    const allModels = response.data.models.map((model: any) => model.name);

    // 2. Filter for completion models
    const capabilityChecks = await Promise.all(allModels.map(hasCompletionCapability));
    const availableModels = allModels.filter((_: any, index: number) => capabilityChecks[index]);

    // 3. Get the current model from langflow-config.json
    let currentModel = 'default'; // Default fallback
    try {
      const configFile = await fs.readFile(LANGFLOW_CONFIG_PATH, 'utf-8');
      const config = JSON.parse(configFile);
      
      // Find the OllamaModel node and get its model_name
      const ollamaNode = config.data.nodes.find((node: any) => node.data.id.startsWith('OllamaModel'));
      if (ollamaNode) {
        currentModel = ollamaNode.data.node.template.model_name.value;
      }
    } catch (error) {
      console.warn('Could not read langflow-config.json to determine current model.', error);
    }
    
    return NextResponse.json({
      availableModels,
      currentModel,
    });

  } catch (error) {
    console.error('Failed to fetch AI models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI models. Is Ollama running?' },
      { status: 500 }
    );
  }
} 