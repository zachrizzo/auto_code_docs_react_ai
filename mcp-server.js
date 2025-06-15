const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const stringSimilarity = require('string-similarity');

const app = express();
const port = 6270;

app.use(cors());
app.use(express.json());

const DOCS_PATH = path.join(__dirname, 'src', 'ui', 'docs-data');

// Endpoint to get the docs path
app.get('/docs-path', (req, res) => {
    res.json({ path: DOCS_PATH });
});

// Endpoint for health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Endpoint to get all available routes
app.get('/routes', (req, res) => {
    const routes = [
        {
            method: 'GET',
            path: '/health',
            description: 'Health check endpoint - returns server status and timestamp'
        },
        {
            method: 'GET', 
            path: '/routes',
            description: 'Get list of all available API routes and their descriptions'
        },
        {
            method: 'GET',
            path: '/docs-path',
            description: 'Get the path to the documentation data directory'
        },
        {
            method: 'GET',
            path: '/entities',
            description: 'Get all code entities from the documentation'
        },
        {
            method: 'GET',
            path: '/entity/:slug',
            description: 'Get a specific entity by its slug identifier'
        },
        {
            method: 'GET',
            path: '/unused-functions',
            description: 'Analyze and return unused functions detected in the codebase'
        },
        {
            method: 'POST',
            path: '/similarity',
            description: 'Find similar code snippets - requires "code" in request body'
        },
        {
            method: 'POST',
            path: '/completion',
            description: 'Code completion endpoint (placeholder) - requires "prompt" in request body'
        },
        {
            method: 'POST',
            path: '/shutdown',
            description: 'Gracefully shutdown the MCP server'
        }
    ];
    
    res.json({
        serverInfo: {
            name: 'Code-Y MCP Server',
            version: '1.0.0',
            port: port,
            uptime: process.uptime(),
            timestamp: new Date()
        },
        routes: routes,
        totalRoutes: routes.length
    });
});

// Endpoint to get all entities
app.get('/entities', async (req, res) => {
    try {
        const indexFile = await fs.readFile(path.join(DOCS_PATH, 'component-index.json'), 'utf-8');
        const indexData = JSON.parse(indexFile);
        
        const entities = await Promise.all(indexData.map(async (item) => {
            const entityFile = await fs.readFile(path.join(DOCS_PATH, `${item.slug}.json`), 'utf-8');
            return JSON.parse(entityFile);
        }));
        
        res.json(entities);
    } catch (error) {
        console.error('Error fetching entities:', error);
        res.status(500).json({ error: 'Failed to fetch entities' });
    }
});

// Endpoint to get a single entity by slug
app.get('/entity/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const entityFile = await fs.readFile(path.join(DOCS_PATH, `${slug}.json`), 'utf-8');
        const entityData = JSON.parse(entityFile);
        res.json(entityData);
    } catch (error) {
        console.error(`Error fetching entity ${req.params.slug}:`, error);
        res.status(404).json({ error: 'Entity not found' });
    }
});

async function getAllEntities() {
    const indexFile = await fs.readFile(path.join(DOCS_PATH, 'component-index.json'), 'utf-8');
    const indexData = JSON.parse(indexFile);
    
    const entities = await Promise.all(indexData.map(async (item) => {
        try {
            const entityFile = await fs.readFile(path.join(DOCS_PATH, `${item.slug}.json`), 'utf-8');
            return JSON.parse(entityFile);
        } catch (e) {
            return null; // Handle cases where a file might be missing
        }
    }));
    return entities.filter(e => e !== null);
}

// Endpoint for code similarity
app.post('/similarity', async (req, res) => {
    const { code, limit = 5 } = req.body;
    if (!code) {
        return res.status(400).json({ error: 'Code snippet is required' });
    }

    try {
        const allEntities = await getAllEntities();
        
        const entitiesWithCode = allEntities.filter(e => e.code && typeof e.code === 'string' && e.code.length > 20);

        if (entitiesWithCode.length === 0) {
            return res.json({ message: 'No code found in the documentation to compare against.' });
        }
        
        const comparisons = entitiesWithCode.map(entity => {
            const similarity = stringSimilarity.compareTwoStrings(code, entity.code);
            return {
                name: entity.name,
                similarity: similarity,
                path: entity.filePath || entity.route,
                id: entity.slug
            };
        });

        const sortedComparisons = comparisons.sort((a, b) => b.similarity - a.similarity);
        
        res.json(sortedComparisons.slice(0, limit));

    } catch (error) {
        console.error('Error in similarity endpoint:', error);
        res.status(500).json({ error: 'Failed to calculate similarity' });
    }
});

// Placeholder for code completion
app.post('/completion', (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }
    // In a real implementation, this would query a local or remote LLM.
    res.json({
        message: 'Completion feature not implemented yet.',
        completion: "res.status(200).json({ message: 'OK' });"
    });
});

// Endpoint to get unused functions analysis
app.get('/unused-functions', async (req, res) => {
    try {
        const allEntities = await getAllEntities();
        
        // Filter entities that have code and analyze for unused functions
        const entitiesWithCode = allEntities.filter(e => e.code && typeof e.code === 'string');
        
        const unusedFunctionsData = [];
        
        for (const entity of entitiesWithCode) {
            const unusedFunctions = analyzeUnusedFunctions(entity.code, entity.name, entity.filePath || entity.route);
            
            if (unusedFunctions.length > 0) {
                unusedFunctionsData.push({
                    name: entity.name,
                    filePath: entity.filePath || entity.route,
                    unusedFunctions: unusedFunctions
                });
            }
        }
        
        res.json(unusedFunctionsData);
    } catch (error) {
        console.error('Error analyzing unused functions:', error);
        res.status(500).json({ error: 'Failed to analyze unused functions' });
    }
});

// Function to analyze code for unused functions
function analyzeUnusedFunctions(code, componentName, filePath) {
    const unusedFunctions = [];
    
    try {
        // Regular expressions to find function definitions
        const functionPatterns = [
            // Regular function declarations: function name(...) { }
            /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{/g,
            // Arrow functions: const name = (...) => { }
            /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:\([^)]*\)\s*=>|\([^)]*\)\s*=>\s*\{|[^=]*=>\s*\{)/g,
            // Method definitions: name(...) { }
            /^\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{/gm
        ];
        
        const definedFunctions = new Set();
        const calledFunctions = new Set();
        
        // Find all function definitions
        functionPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(code)) !== null) {
                const functionName = match[1];
                if (functionName && !isReactMethod(functionName)) {
                    definedFunctions.add(functionName);
                }
            }
        });
        
        // Find all function calls
        const callPattern = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
        let callMatch;
        while ((callMatch = callPattern.exec(code)) !== null) {
            const functionName = callMatch[1];
            if (functionName && !isBuiltinOrReactMethod(functionName)) {
                calledFunctions.add(functionName);
            }
        }
        
        // Find unused functions
        definedFunctions.forEach(funcName => {
            if (!calledFunctions.has(funcName)) {
                // Get more details about the function
                const functionDetails = getFunctionDetails(code, funcName);
                if (functionDetails) {
                    unusedFunctions.push({
                        name: funcName,
                        filePath: filePath,
                        lineNumber: functionDetails.lineNumber,
                        type: functionDetails.type,
                        parameters: functionDetails.parameters,
                        isExported: functionDetails.isExported
                    });
                }
            }
        });
        
    } catch (error) {
        console.error(`Error analyzing functions in ${componentName}:`, error);
    }
    
    return unusedFunctions;
}

// Helper function to check if a name is a React method or lifecycle method
function isReactMethod(name) {
    const reactMethods = [
        'render', 'componentDidMount', 'componentDidUpdate', 'componentWillUnmount',
        'useState', 'useEffect', 'useContext', 'useReducer', 'useCallback', 'useMemo',
        'constructor', 'componentDidCatch', 'getDerivedStateFromError'
    ];
    return reactMethods.includes(name);
}

// Helper function to check if a name is a builtin or React method
function isBuiltinOrReactMethod(name) {
    const builtins = [
        'console', 'log', 'error', 'warn', 'map', 'filter', 'reduce', 'forEach', 'find',
        'parseInt', 'parseFloat', 'JSON', 'Math', 'Date', 'Array', 'Object', 'String',
        'Number', 'Boolean', 'RegExp', 'Promise', 'setTimeout', 'setInterval', 'fetch',
        'require', 'import', 'export', 'default', 'if', 'else', 'for', 'while', 'do',
        'switch', 'case', 'break', 'continue', 'return', 'throw', 'try', 'catch', 'finally'
    ];
    return builtins.includes(name) || isReactMethod(name);
}

// Helper function to get detailed information about a function
function getFunctionDetails(code, functionName) {
    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check for function declaration
        if (line.includes(`function ${functionName}`) || 
            line.includes(`${functionName} =`) ||
            line.includes(`${functionName}(`)) {
            
            const parameters = extractParameters(line);
            const isExported = line.includes('export') || 
                             (i > 0 && lines[i-1].includes('export')) ||
                             code.includes(`export { ${functionName}`) ||
                             code.includes(`export {${functionName}`);
            
            let type = 'function';
            if (line.includes('=>')) {
                type = 'arrow-function';
            } else if (line.match(/^\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(/)) {
                type = 'method';
            }
            
            return {
                lineNumber: i + 1,
                type: type,
                parameters: parameters,
                isExported: isExported
            };
        }
    }
    
    return null;
}

// Helper function to extract parameters from a function definition line
function extractParameters(line) {
    const paramMatch = line.match(/\(([^)]*)\)/);
    if (paramMatch && paramMatch[1]) {
        return paramMatch[1]
            .split(',')
            .map(param => param.trim().split(/[=\s]/)[0])
            .filter(param => param.length > 0);
    }
    return [];
}


// Endpoint to shut down the server
app.post('/shutdown', (req, res) => {
    res.json({ message: 'Server is shutting down.' });
    process.exit(0);
});

app.listen(port, () => {
    console.log(`MCP Server listening at http://localhost:${port}`);
    // Write PID to a file to be able to stop it later
    fs.writeFile('mcp-server.pid', process.pid.toString())
        .catch(err => console.error('Could not write PID file', err));
}); 