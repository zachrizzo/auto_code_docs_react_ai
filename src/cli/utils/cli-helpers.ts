import net from "net";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs-extra";
import * as path from "path";

const execAsync = promisify(exec);

/**
 * Check if a port is in use on the local machine.
 * @param port The port number to check.
 * @returns Promise resolving to true if the port is in use, false otherwise.
 */
export function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => {
      resolve(true); // Port is in use
    });
    server.once("listening", () => {
      server.close();
      resolve(false); // Port is free
    });
    server.listen(port);
  });
}

/**
 * Find a free port, starting from a given port number.
 * @param startPort The starting port number.
 * @returns Promise resolving to the first free port found.
 */
export async function findFreePort(startPort: number): Promise<number> {
  let port = startPort;
  while (await isPortInUse(port)) {
    console.log(`Port ${port} is already in use, trying next port...`);
    port++;
  }
  return port;
}

/**
 * Enhanced error handling with user-friendly messages
 */
export class CLIError extends Error {
  constructor(
    message: string,
    public code: string,
    public suggestion?: string
  ) {
    super(message);
    this.name = 'CLIError';
  }
}

/**
 * Validation utilities
 */
export class Validator {
  static validateProjectRoot(rootPath: string): void {
    if (!fs.existsSync(rootPath)) {
      throw new CLIError(
        `Project root does not exist: ${rootPath}`,
        'INVALID_ROOT',
        'Please provide a valid project directory path'
      );
    }
    
    if (!fs.statSync(rootPath).isDirectory()) {
      throw new CLIError(
        `Path is not a directory: ${rootPath}`,
        'NOT_DIRECTORY',
        'Please provide a directory path, not a file'
      );
    }
  }
  
  static validatePort(port: string | number): number {
    const portNum = typeof port === 'string' ? parseInt(port, 10) : port;
    
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      throw new CLIError(
        `Invalid port: ${port}`,
        'INVALID_PORT',
        'Port must be a number between 1 and 65535'
      );
    }
    
    return portNum;
  }
  
  static async validateNodeVersion(): Promise<void> {
    try {
      const { stdout } = await execAsync('node --version');
      const version = stdout.trim().replace('v', '');
      const [major] = version.split('.').map(Number);
      
      if (major < 16) {
        throw new CLIError(
          `Node.js version ${version} is not supported`,
          'UNSUPPORTED_NODE',
          'Please upgrade to Node.js 16 or higher'
        );
      }
    } catch (error) {
      throw new CLIError(
        'Could not determine Node.js version',
        'NODE_CHECK_FAILED',
        'Please ensure Node.js is installed and accessible'
      );
    }
  }
}

/**
 * User feedback utilities
 */
export class Logger {
  static info(message: string): void {
    console.log(`ℹ️  ${message}`);
  }
  
  static success(message: string): void {
    console.log(`✅ ${message}`);
  }
  
  static warning(message: string): void {
    console.log(`⚠️  ${message}`);
  }
  
  static error(message: string, suggestion?: string): void {
    console.error(`❌ ${message}`);
    if (suggestion) {
      console.error(`💡 ${suggestion}`);
    }
  }
  
  static step(step: number, total: number, message: string): void {
    console.log(`[${step}/${total}] ${message}`);
  }
  
  static progress(message: string): void {
    console.log(`⏳ ${message}`);
  }
}

/**
 * Enhanced service health checks
 */
export class HealthChecker {
  static async checkOllama(url: string = 'http://localhost:11434'): Promise<{
    healthy: boolean;
    version?: string;
    models?: string[];
    error?: string;
  }> {
    try {
      const axios = require('axios');
      
      // Check if Ollama is running
      const healthResponse = await axios.get(`${url}/api/version`, {
        timeout: 5000
      });
      
      // Get available models
      const modelsResponse = await axios.get(`${url}/api/tags`, {
        timeout: 5000
      });
      
      return {
        healthy: true,
        version: healthResponse.data.version,
        models: modelsResponse.data.models?.map((m: any) => m.name) || []
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  static async checkDocker(): Promise<{
    installed: boolean;
    running: boolean;
    version?: string;
    error?: string;
  }> {
    try {
      const { stdout: versionOut } = await execAsync('docker --version');
      const version = versionOut.trim();
      
      try {
        await execAsync('docker ps');
        return { installed: true, running: true, version };
      } catch (psError) {
        return {
          installed: true,
          running: false,
          version,
          error: 'Docker daemon is not running'
        };
      }
    } catch (error) {
      return {
        installed: false,
        running: false,
        error: 'Docker is not installed'
      };
    }
  }
}
