import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const projectRoot = path.resolve(process.cwd(), '../../');
const pidFilePath = path.join(projectRoot, 'mcp-server.pid');
const mcpPort = 6270;

async function isServerRunning() {
    try {
        const response = await fetch(`http://localhost:${mcpPort}/health`);
        return response.ok;
    } catch (error) {
        return false;
    }
}

export async function POST() {
    if (!(await isServerRunning())) {
        return NextResponse.json({ message: 'MCP Server is not running.' });
    }

    try {
        const pid = await fs.readFile(pidFilePath, 'utf-8');
        if (pid) {
            try {
                process.kill(parseInt(pid, 10));
            } catch (e) {
                // Ignore error if process is already dead
            }
            await fs.unlink(pidFilePath);
        }
    } catch (error) {
        // PID file might not exist, but we can try to shut down via API
    }

    // Also try to shut down via endpoint, in case the PID belongs to another process
    try {
        await fetch(`http://localhost:${mcpPort}/shutdown`, { method: 'POST' });
    } catch (error) {
        // Ignore error, server might be already down
    }
    
    // Wait a moment for the server to shut down
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (await isServerRunning()) {
        return NextResponse.json({ error: 'Failed to stop MCP Server.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'MCP Server stopped.' });
} 