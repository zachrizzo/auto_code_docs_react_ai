import { EmbeddedLangFlow } from './embedded-langflow';
import { DockerManager } from '../../cli/utils/docker-manager';
import * as path from 'path';

export interface LangFlowManagerOptions {
  projectRoot: string;
  langflowConfigPath?: string;
  ollamaUrl?: string;
  port?: number;
  preferEmbedded?: boolean;
}

export class LangFlowManager {
  private embeddedLangFlow?: EmbeddedLangFlow;
  private dockerManager?: DockerManager;
  private options: LangFlowManagerOptions;
  private activeService?: 'embedded' | 'docker';

  constructor(options: LangFlowManagerOptions) {
    this.options = {
      preferEmbedded: true,
      port: 6271,
      ...options
    };
  }

  /**
   * Start LangFlow service - tries embedded first, then Docker
   */
  async start(): Promise<{ success: boolean; service: 'embedded' | 'docker' | 'none'; url?: string }> {
    console.log('🚀 Starting AI services...');

    // Try embedded version first (unless disabled)
    if (this.options.preferEmbedded !== false) {
      console.log('📦 Attempting to start embedded Python server...');
      
      this.embeddedLangFlow = new EmbeddedLangFlow({
        port: this.options.port,
        langflowConfigPath: this.options.langflowConfigPath,
        ollamaUrl: this.options.ollamaUrl
      });

      const embeddedStarted = await this.embeddedLangFlow.start();
      if (embeddedStarted) {
        this.activeService = 'embedded';
        console.log('✅ Embedded LangFlow server is running');
        return {
          success: true,
          service: 'embedded',
          url: this.embeddedLangFlow.getUrl()
        };
      } else {
        console.warn('⚠️  Embedded server failed to start, trying Docker...');
      }
    }

    // Fall back to Docker
    console.log('🐳 Attempting to start Docker containers...');
    
    this.dockerManager = new DockerManager({
      projectRoot: this.options.projectRoot,
      langflowConfigPath: this.options.langflowConfigPath,
      ollamaUrl: this.options.ollamaUrl
    });

    const dockerAvailable = await this.dockerManager.checkDocker();
    if (!dockerAvailable) {
      console.warn('⚠️  Docker not available');
      return { success: false, service: 'none' };
    }

    const dockerStarted = await this.dockerManager.startContainers();
    if (dockerStarted) {
      this.activeService = 'docker';
      console.log('✅ Docker LangFlow server is running');
      return {
        success: true,
        service: 'docker',
        url: `http://localhost:${this.options.port}`
      };
    }

    console.error('❌ Failed to start any AI service');
    return { success: false, service: 'none' };
  }

  /**
   * Stop all services
   */
  async stop(cleanup: boolean = false): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.embeddedLangFlow) {
      promises.push(this.embeddedLangFlow.stop(cleanup));
    }

    if (this.dockerManager) {
      promises.push(this.dockerManager.stopContainers());
    }

    await Promise.all(promises);
    this.activeService = undefined;
  }

  /**
   * Cleanup all temporary files and environments
   */
  async cleanup(): Promise<void> {
    if (this.embeddedLangFlow) {
      await this.embeddedLangFlow.cleanupEnvironment();
    }
  }

  /**
   * Get environment information
   */
  async getEnvironmentInfo(): Promise<{
    service: 'embedded' | 'docker' | 'none';
    size?: string;
    location?: string;
  }> {
    if (this.activeService === 'embedded' && this.embeddedLangFlow) {
      const size = await this.embeddedLangFlow.getEnvironmentSize();
      return {
        service: 'embedded',
        size,
        location: 'temp/codey-venv'
      };
    }
    
    if (this.activeService === 'docker') {
      return {
        service: 'docker',
        location: 'Docker containers'
      };
    }

    return { service: 'none' };
  }

  /**
   * Check if any service is running
   */
  async isRunning(): Promise<boolean> {
    if (this.activeService === 'embedded' && this.embeddedLangFlow) {
      return await this.embeddedLangFlow.isRunning();
    }
    
    if (this.activeService === 'docker' && this.dockerManager) {
      const status = await this.dockerManager.getContainerStatus();
      return status.langflow;
    }

    return false;
  }

  /**
   * Get the URL of the active service
   */
  getServiceUrl(): string | null {
    if (this.activeService === 'embedded' && this.embeddedLangFlow) {
      return this.embeddedLangFlow.getUrl();
    }
    
    if (this.activeService === 'docker') {
      return `http://localhost:${this.options.port}`;
    }

    return null;
  }

  /**
   * Get the active service type
   */
  getActiveService(): 'embedded' | 'docker' | 'none' {
    return this.activeService || 'none';
  }

  /**
   * Get service status information
   */
  async getStatus(): Promise<{
    activeService: 'embedded' | 'docker' | 'none';
    isRunning: boolean;
    url: string | null;
    details?: any;
  }> {
    const isRunning = await this.isRunning();
    const result = {
      activeService: this.getActiveService(),
      isRunning,
      url: this.getServiceUrl(),
      details: undefined as any
    };

    if (this.activeService === 'docker' && this.dockerManager) {
      result.details = await this.dockerManager.getContainerStatus();
    }

    return result;
  }

  /**
   * Force use of specific service type
   */
  setPreferredService(service: 'embedded' | 'docker'): void {
    this.options.preferEmbedded = service === 'embedded';
  }
}