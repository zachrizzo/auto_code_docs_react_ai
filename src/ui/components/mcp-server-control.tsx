"use client"
import * as React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { ScrollArea } from "./ui/scroll-area"
import { Server, Zap, Info } from "lucide-react"
import { CodeBlock } from "./code-block"

interface Route {
  method: string;
  path: string;
  description: string;
}

interface ServerInfo {
  name: string;
  version: string;
  port: number;
  uptime: number;
  timestamp: string;
}

interface RoutesResponse {
  serverInfo: ServerInfo;
  routes: Route[];
  totalRoutes: number;
}

export function McpServerControl() {
  const [mcpStatus, setMcpStatus] = useState<'stopped' | 'running' | 'loading' | 'error'>('stopped');
  const [mcpPort, setMcpPort] = useState<number | null>(null);
  const [mcpConfig, setMcpConfig] = useState<any>(null);
  const [routesData, setRoutesData] = useState<RoutesResponse | null>(null);
  const mcpServerPort = 6270;

  useEffect(() => {
    const fetchMcpConfig = async () => {
        try {
            const res = await fetch('/api/mcp/config');
            if (res.ok) {
                const config = await res.json();
                setMcpConfig(config);
            }
        } catch (e) {
            console.error("Failed to fetch MCP config", e);
        }
    };
    fetchMcpConfig();
  }, []);

  useEffect(() => {
    const checkStatus = async () => {
        try {
            const res = await fetch(`http://localhost:${mcpServerPort}/health`);
            if (res.ok) {
                setMcpStatus('running');
                setMcpPort(mcpServerPort);
                // Fetch routes data when server is running
                fetchRoutesData();
            } else {
                setMcpStatus('stopped');
                setRoutesData(null);
            }
        } catch (e) {
            setMcpStatus('stopped');
            setRoutesData(null);
        }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [mcpServerPort]);

  const fetchRoutesData = async () => {
    try {
        const res = await fetch(`http://localhost:${mcpServerPort}/routes`);
        if (res.ok) {
            const data: RoutesResponse = await res.json();
            setRoutesData(data);
        }
    } catch (e) {
        console.error('Failed to fetch routes data:', e);
    }
  };

  const handleStartMcpServer = async () => {
    setMcpStatus('loading');
    try {
        const res = await fetch('/api/mcp/start', { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
            setMcpStatus('running');
            setMcpPort(data.port);
        } else {
            setMcpStatus('error');
        }
    } catch (e) {
        setMcpStatus('error');
    }
  };

  const handleStopMcpServer = async () => {
    setMcpStatus('loading');
    try {
        const res = await fetch('/api/mcp/stop', { method: 'POST' });
        if (res.ok) {
            setMcpStatus('stopped');
            setMcpPort(null);
        } else {
            setMcpStatus('error');
        }
    } catch (e) {
        setMcpStatus('error');
    }
  };
  
  const restApiExample = `
### Get server health
GET http://localhost:${mcpServerPort}/health

### Get all available routes
GET http://localhost:${mcpServerPort}/routes

### Get all code entities
GET http://localhost:${mcpServerPort}/entities

### Get unused functions analysis
GET http://localhost:${mcpServerPort}/unused-functions

### Find similar code
POST http://localhost:${mcpServerPort}/similarity
Content-Type: application/json

{
  "code": "function example() { return 'hello'; }",
  "limit": 5
}
  `.trim();

  return (
    <Card className="bg-white dark:bg-slate-900 shadow-sm">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            MCP Server Integration
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Control Panel */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Control Panel</h3>
            <p className="text-sm text-muted-foreground">
              Start the server from this UI, or use the JSON config to let your IDE manage it.
            </p>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  Server Status
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <Badge variant={mcpStatus === 'running' ? 'default' : 'outline'}>
                  <div className={`h-2 w-2 rounded-full mr-2 ${
                    mcpStatus === 'running' ? 'bg-green-500' :
                    mcpStatus === 'stopped' ? 'bg-red-500' :
                    mcpStatus === 'loading' ? 'bg-yellow-500 animate-pulse' :
                    'bg-gray-500'
                  }`}></div>
                  {mcpStatus}
                </Badge>
                {mcpStatus === 'running' ? (
                  <Button size="sm" variant="destructive" onClick={handleStopMcpServer}>
                    Stop Server
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleStartMcpServer} disabled={mcpStatus === 'loading'}>
                    Start Server
                  </Button>
                )}
              </CardContent>
            </Card>

            {mcpStatus === 'running' && mcpPort && routesData && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Server Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><strong>Name:</strong> {routesData.serverInfo.name}</div>
                    <div><strong>Version:</strong> {routesData.serverInfo.version}</div>
                    <div><strong>Port:</strong> {routesData.serverInfo.port}</div>
                    <div><strong>Uptime:</strong> {Math.floor(routesData.serverInfo.uptime)}s</div>
                  </div>
                  <div>
                    <p className="text-sm mb-2"><strong>Server URL:</strong> <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">http://localhost:{mcpPort}</code></p>
                    <p className="text-sm mb-2"><strong>Available Routes ({routesData.totalRoutes}):</strong></p>
                    <ScrollArea className="h-32">
                      <div className="space-y-2 pr-4">
                        {routesData.routes.map((route, index) => (
                          <div key={index} className="p-2 bg-slate-50 dark:bg-slate-800 rounded text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={route.method === 'GET' ? 'default' : 'secondary'} className="text-xs">
                                {route.method}
                              </Badge>
                              <code className="font-mono">{route.path}</code>
                            </div>
                            <p className="text-muted-foreground">{route.description}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Integration Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Integration</h3>
            
            <div>
              <h4 className="font-semibold mb-2">IDE Configuration</h4>
              <p className="text-sm text-muted-foreground mb-2">
                  For IDEs like Cursor, use this configuration to connect to the MCP server.
              </p>
              <div className="bg-slate-900 rounded-lg">
                  <CodeBlock 
                      code={mcpConfig ? JSON.stringify(mcpConfig, null, 2) : "Loading config..."} 
                      language="json" 
                  />
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">API Usage Example (REST Client)</h4>
               <p className="text-sm text-muted-foreground mb-2">
                  Once the server is running, use these examples to interact with it.
              </p>
               <div className="bg-slate-900 rounded-lg">
                  <CodeBlock code={restApiExample} language="http" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 