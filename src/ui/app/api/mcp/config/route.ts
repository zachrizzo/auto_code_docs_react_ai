import { NextResponse } from 'next/server';
import path from 'path';

export async function GET() {
    // Resolve the project root from the API route's location
    const projectRoot = path.resolve(process.cwd(), '../../');
    const serverPath = path.join(projectRoot, 'mcp-server.js');
    
    // Assumes 'node' is in the user's PATH
    const config = {
      mcpServers: {
        "code-y-mcp": {
          command: "node",
          args: [serverPath]
        }
      }
    };
    
    return NextResponse.json(config);
} 