import { execSync, spawn, ChildProcess } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import axios from 'axios';

export interface DockerManagerOptions {
  projectRoot: string;
  langflowConfigPath?: string;
  ollamaUrl?: string;
}

export class DockerManager {
  private options: DockerManagerOptions;
  private dockerProcess?: ChildProcess;
  
  constructor(options: DockerManagerOptions) {
    this.options = options;
  }
  
  /**
   * Check if Docker is installed and running
   */
  async checkDocker(): Promise<boolean> {
    try {
      execSync('docker --version', { stdio: 'pipe' });
      execSync('docker ps', { stdio: 'pipe' });
      return true;
    } catch (error) {
      console.error('❌ Docker is not installed or not running');
      console.log('Please install Docker from https://www.docker.com/get-started');
      return false;
    }
  }
  
  /**
   * Check if Docker Compose is installed
   */
  async checkDockerCompose(): Promise<boolean> {
    try {
      execSync('docker-compose --version', { stdio: 'pipe' });
      return true;
    } catch (error) {
      // Try docker compose (newer version)
      try {
        execSync('docker compose version', { stdio: 'pipe' });
        return true;
      } catch {
        console.error('❌ Docker Compose is not installed');
        return false;
      }
    }
  }
  
  /**
   * Copy LangFlow config to Docker directory
   */
  async copyLangFlowConfig(): Promise<void> {
    const dockerDir = path.join(this.options.projectRoot, 'docker');
    const targetPath = path.join(dockerDir, 'langflow-config.json');
    
    // Look for LangFlow config in multiple locations (in order of preference)
    const possiblePaths = [
      this.options.langflowConfigPath, // Explicitly provided path
      path.join(this.options.projectRoot, 'configs', 'langflow-config.json'), // Configs directory (preferred)
      path.join(this.options.projectRoot, 'langflow-config.json'), // Project root
      path.join(this.options.projectRoot, 'Codey-ai.json'), // Your existing config
      path.join(process.cwd(), 'langflow-config.json'), // Current directory
      path.join(process.cwd(), 'Codey-ai.json') // Current directory fallback
    ].filter(Boolean) as string[];
    
    let configFound = false;
    for (const configPath of possiblePaths) {
      if (await fs.pathExists(configPath)) {
        await fs.copy(configPath, targetPath);
        console.log(`✅ Using LangFlow configuration from: ${path.relative(process.cwd(), configPath)}`);
        configFound = true;
        break;
      }
    }
    
    if (!configFound) {
      console.log('ℹ️  No custom LangFlow configuration found - using default AI flow');
      console.log('   To customize AI behavior, export your flow from LangFlow as JSON');
    }
  }
  
  /**
   * Start Docker containers
   */
  async startContainers(): Promise<boolean> {
    try {
      const dockerComposeFile = path.join(this.options.projectRoot, 'docker', 'docker-compose.yml');
      
      if (!await fs.pathExists(dockerComposeFile)) {
        console.error('❌ docker-compose.yml not found');
        return false;
      }
      
      // Copy LangFlow config
      await this.copyLangFlowConfig();
      
      console.log('🐳 Starting Docker containers...');
      
      // Use docker compose or docker-compose depending on what's available
      const composeCommand = await this.checkDockerCompose() ? 
        (execSync('docker compose version', { stdio: 'pipe' }).toString().includes('Docker Compose') ? 'docker compose' : 'docker-compose') 
        : null;
      
      if (!composeCommand) {
        return false;
      }
      
      // Start containers in detached mode
      execSync(`${composeCommand} -f ${dockerComposeFile} up -d`, {
        stdio: 'inherit',
        cwd: path.dirname(dockerComposeFile)
      });
      
      console.log('⏳ Waiting for services to be ready...');
      
      // Wait for services to be healthy
      const maxRetries = 30;
      let retries = 0;
      
      while (retries < maxRetries) {
        try {
          // Check LangFlow server health
          const response = await axios.get('http://localhost:6271/health', {
            timeout: 2000
          });
          
          if (response.data.status === 'healthy') {
            console.log('✅ LangFlow server is ready');
            return true;
          }
        } catch (error) {
          // Service not ready yet
        }
        
        retries++;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      console.error('❌ Services failed to start within timeout');
      return false;
      
    } catch (error) {
      console.error('Error starting Docker containers:', error);
      return false;
    }
  }
  
  /**
   * Stop Docker containers
   */
  async stopContainers(): Promise<void> {
    try {
      const dockerComposeFile = path.join(this.options.projectRoot, 'docker', 'docker-compose.yml');
      
      if (!await fs.pathExists(dockerComposeFile)) {
        return;
      }
      
      const composeCommand = await this.checkDockerCompose() ? 
        (execSync('docker compose version', { stdio: 'pipe' }).toString().includes('Docker Compose') ? 'docker compose' : 'docker-compose') 
        : null;
      
      if (!composeCommand) {
        return;
      }
      
      console.log('🛑 Stopping Docker containers...');
      
      execSync(`${composeCommand} -f ${dockerComposeFile} down`, {
        stdio: 'inherit',
        cwd: path.dirname(dockerComposeFile)
      });
      
      console.log('✅ Docker containers stopped');
      
    } catch (error) {
      console.error('Error stopping Docker containers:', error);
    }
  }
  
  /**
   * Check container status
   */
  async getContainerStatus(): Promise<{
    langflow: boolean;
    redis: boolean;
  }> {
    try {
      const langflowStatus = execSync('docker ps --filter "name=codey-langflow-server" --format "{{.Status}}"', {
        encoding: 'utf-8'
      }).toString().trim();
      
      const redisStatus = execSync('docker ps --filter "name=codey-redis" --format "{{.Status}}"', {
        encoding: 'utf-8'
      }).toString().trim();
      
      return {
        langflow: langflowStatus.includes('Up'),
        redis: redisStatus.includes('Up')
      };
    } catch {
      return { langflow: false, redis: false };
    }
  }
  
  /**
   * View container logs
   */
  async viewLogs(service: 'langflow' | 'redis', lines: number = 100): Promise<string> {
    try {
      const containerName = service === 'langflow' ? 'codey-langflow-server' : 'codey-redis';
      const logs = execSync(`docker logs ${containerName} --tail ${lines}`, {
        encoding: 'utf-8'
      });
      return logs;
    } catch (error) {
      return `Failed to get logs for ${service}`;
    }
  }
}