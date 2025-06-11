const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = 6270;

app.use(cors());
app.use(express.json());

const DOCS_PATH = path.join(__dirname, 'public', 'docs-data');

// Endpoint to get the docs path
app.get('/docs-path', (req, res) => {
    res.json({ path: DOCS_PATH });
});

// Endpoint for health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
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

// Placeholder for code similarity
app.post('/similarity', (req, res) => {
    const { code } = req.body;
    if (!code) {
        return res.status(400).json({ error: 'Code snippet is required' });
    }
    // In a real implementation, this would involve vectorizing the code
    // and comparing it against a vector database of the codebase.
    res.json({
        message: 'Similarity feature not implemented yet.',
        similar_functions: [
            { name: 'dummyFunction1', similarity: 0.9, path: 'src/utils/dummy1.ts' },
            { name: 'dummyFunction2', similarity: 0.8, path: 'src/utils/dummy2.ts' }
        ]
    });
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