import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const mcpPort = 6270;
// Resolve the project root based on the likely location of the running script
const projectRoot = path.resolve(process.cwd(), '../../');
const pidFilePath = path.join(projectRoot, 'mcp-server.pid');

async function isServerRunning() {
    try {
        const response = await fetch(`http://localhost:${mcpPort}/health`);
        return response.ok;
    } catch (error) {
        return false;
    }
}

export async function POST() {
    if (await isServerRunning()) {
        return NextResponse.json({ message: 'MCP Server is already running.', port: mcpPort });
    }

    const serverPath = path.join(projectRoot, 'mcp-server.js');
    
    try {
        await fs.access(serverPath);
    } catch (error) {
        console.error(`mcp-server.js not found at ${serverPath}`, error);
        return NextResponse.json({ error: 'mcp-server.js not found.' }, { status: 500 });
    }

    const child = spawn('node', [serverPath], {
        detached: true,
        stdio: 'ignore',
        cwd: projectRoot, // Set the working directory for the spawned process
    });

    child.unref();

    // Wait a moment to allow the server to start and write the PID file.
    await new Promise(resolve => setTimeout(resolve, 500));

    if (await isServerRunning()) {
        return NextResponse.json({ message: 'MCP Server started.', port: mcpPort });
    } else {
        return NextResponse.json({ error: 'Failed to start MCP Server.' }, { status: 500 });
    }
} 