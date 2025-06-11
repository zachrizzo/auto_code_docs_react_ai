const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const stringSimilarity = require('string-similarity');

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