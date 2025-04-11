const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const port = process.env.PORT || 3001;
const docsPath = path.join(process.cwd(), 'docs');

// Mock responses for the chat AI
const mockResponses = [
    "I can help explain the component structure. What specific component are you interested in?",
    "The recursive patterns in this codebase are used for traversing nested data structures efficiently.",
    "Looking at the calculatePatientCost component, it recursively calculates costs by traversing the patient's treatment history.",
    "The Fibonacci component demonstrates a classic recursive algorithm with memoization to improve performance.",
    "The findPatient function uses recursion to search through hospital hierarchies (floors, wings, rooms).",
    "buildHospitalOrgChart shows how to recursively build organizational structures like a tree.",
    "To learn more about a specific component, try clicking on it in the component list.",
    "Recursive functions are particularly useful when dealing with tree-like data structures or nested components.",
    "The code examples demonstrate best practices for implementing recursive algorithms in React."
];

// Simple mock chat model
function generateChatResponse(query) {
    // Extract keywords from query
    const keywords = query.toLowerCase().split(/\s+/);

    // Check for specific keywords and provide targeted responses
    if (keywords.includes('fibonacci')) {
        return "The Fibonacci component demonstrates recursive calculation with memoization to avoid redundant calculations. It's a classic example of dynamic programming.";
    }

    if (keywords.includes('patient') || keywords.includes('healthcare') || keywords.includes('hospital')) {
        return "The healthcare-related components (calculatePatientCost, findPatient, buildHospitalOrgChart) demonstrate how recursion can be used in real-world applications like traversing patient records or organizational structures.";
    }

    if (keywords.includes('code') || keywords.includes('example')) {
        return "The code examples in this documentation show how to implement recursive functions in React. They include proper handling of base cases and careful state management to avoid infinite loops.";
    }

    if (keywords.includes('recursion') || keywords.includes('recursive')) {
        return "Recursion is a programming technique where a function calls itself. In this codebase, it's used for traversing nested structures, calculating sequences, and building hierarchical UIs.";
    }

    // If no specific keywords match, return a random response
    return mockResponses[Math.floor(Math.random() * mockResponses.length)];
}

// Create server
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url || '', true);
    const pathname = parsedUrl.pathname || '';

    // Set CORS headers to allow requests from any origin
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Handle API requests
    if (pathname === '/api/chat' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                const { query } = JSON.parse(body);
                const response = generateChatResponse(query);

                // Add a small delay to simulate processing time
                setTimeout(() => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        response,
                        searchResults: [] // Empty search results for simplicity
                    }));
                }, 500);
            } catch (error) {
                console.error('Error handling chat request:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        });

        return;
    }

    // Handle component code API endpoint
    if (pathname === '/api/component-code' && req.method === 'GET') {
        try {
            const queryParams = parsedUrl.query;
            const componentName = queryParams.name;

            if (!componentName) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Component name is required' }));
                return;
            }

            // Return mock data for the component
            const mockCode = `// Example code for ${componentName}
function ${componentName}(props) {
  // This is a mock implementation
  return React.createElement(
    'div',
    { className: '${componentName.toLowerCase()}-container' },
    'Example implementation of ${componentName}'
  );
}`;

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                sourceCode: mockCode,
                methods: [
                    {
                        name: 'initialize',
                        description: 'Initializes the component with default values',
                        code: `function initialize() {\n  // Default initialization\n  return { count: 0 };\n}`
                    },
                    {
                        name: 'processData',
                        description: 'Processes data using recursive algorithms',
                        code: `function processData(data) {\n  if (!data || data.length === 0) {\n    return [];\n  }\n  return [data[0]].concat(processData(data.slice(1)));\n}`
                    }
                ]
            }));
        } catch (error) {
            console.error('Error handling component code request:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
        return;
    }

    // Handle static file requests
    const filePath = path.join(docsPath, pathname === '/' ? 'index.html' : pathname);

    fs.readFile(filePath, (err, data) => {
        if (err) {
            // If file doesn't exist, serve index.html (for SPA routing)
            if (err.code === 'ENOENT' && !pathname.includes('.')) {
                fs.readFile(path.join(docsPath, 'index.html'), (err, data) => {
                    if (err) {
                        res.writeHead(404);
                        res.end('Not Found');
                        return;
                    }

                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(data);
                });
                return;
            }

            res.writeHead(404);
            res.end('Not Found');
            return;
        }

        // Set content type based on file extension
        const ext = path.extname(filePath).toLowerCase();
        const contentType = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpg',
            '.gif': 'image/gif',
        }[ext] || 'text/plain';

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

// Start server
server.listen(port, () => {
    console.log(`🚀 Mock server running at http://localhost:${port}`);
    console.log('💬 Mock Chat API available at: http://localhost:${port}/api/chat');
    console.log('💻 Mock Component Code API available at: http://localhost:${port}/api/component-code?name=ComponentName');
    console.log('Press Ctrl+C to stop the server');
});
