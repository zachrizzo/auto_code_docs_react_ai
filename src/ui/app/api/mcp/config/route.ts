import { NextResponse } from 'next/server';
import path from 'path';
import { execSync } from 'child_process';

export async function GET() {
    // Resolve the server path based on package installation location
    let serverPath: string;
    let resolvedFromPackage = false;
    
    // Method 1: Try to resolve from installed package location
    try {
        const packagePath = require.resolve('@zachrizzo/code-y/package.json');
        const packageDir = path.dirname(packagePath);
        serverPath = path.join(packageDir, 'mcp-server.js');
        resolvedFromPackage = true;
    } catch (error) {
        // Method 2: Try to find via npm list global
        try {
            const npmGlobalPath = execSync('npm root -g', { encoding: 'utf-8' }).trim();
            const globalPackagePath = path.join(npmGlobalPath, '@zachrizzo', 'code-y', 'mcp-server.js');
            serverPath = globalPackagePath;
            resolvedFromPackage = true;
        } catch (error2) {
            // Method 3: Try to find via global node_modules
            try {
                const globalModulesPath = require.resolve('@zachrizzo/code-y');
                const packageDir = path.dirname(globalModulesPath);
                serverPath = path.join(packageDir, 'mcp-server.js');
                resolvedFromPackage = true;
            } catch (error3) {
                // Method 4: Try to resolve relative to current working directory
                try {
                    const localPath = path.join(process.cwd(), 'node_modules', '@zachrizzo', 'code-y', 'mcp-server.js');
                    serverPath = localPath;
                    resolvedFromPackage = true;
                } catch (error4) {
                    // Method 5: Fallback to development path
                    const projectRoot = path.resolve(process.cwd(), '../../');
                    serverPath = path.join(projectRoot, 'mcp-server.js');
                    resolvedFromPackage = false;
                }
            }
        }
    }
    
    // Assumes 'node' is in the user's PATH
    const config = {
      mcpServers: {
        "code-y-mcp": {
          command: "node",
          args: [serverPath]
        }
      },
      // Debug info (can be removed in production)
      _debug: {
        resolvedFromPackage,
        serverPath,
        cwd: process.cwd()
      }
    };
    
    return NextResponse.json(config);
} 