#!/usr/bin/env node

/**
 * This script processes the generated docs data and prepares it for use with the Next.js app.
 * It copies the necessary files and transforms the data for better integration.
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const copyFile = promisify(fs.copyFile);

// Path configurations
const DEFAULT_INPUT_PATH = process.env.DOCS_PATH || path.resolve(process.cwd(), '../../docs');
const PUBLIC_PATH = path.resolve(process.cwd(), 'public');
const DATA_PATH = path.resolve(PUBLIC_PATH, 'docs-data');

/**
 * Function to convert a component name to a URL-friendly slug
 */
function nameToSlug(name) {
    return name
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/\s+/g, '-')
        .toLowerCase();
}

/**
 * Main function to process and copy docs data
 */
async function processDocsData() {
    try {
        console.log('Processing docs data...');
        console.log(`Looking for docs in: ${DEFAULT_INPUT_PATH}`);

        // Check if the docs directory exists
        if (!fs.existsSync(DEFAULT_INPUT_PATH)) {
            console.error(`Docs directory not found: ${DEFAULT_INPUT_PATH}`);
            return;
        }

        // Check for data.js file in the docs directory
        const dataJsPath = path.join(DEFAULT_INPUT_PATH, 'data.js');
        if (!fs.existsSync(dataJsPath)) {
            console.error(`data.js not found in ${DEFAULT_INPUT_PATH}`);
            return;
        }

        // Create the docs-data directory in public if it doesn't exist
        if (!fs.existsSync(DATA_PATH)) {
            await mkdir(DATA_PATH, { recursive: true });
        }

        // Copy data.js to public/docs-data
        await copyFile(dataJsPath, path.join(DATA_PATH, 'data.js'));
        console.log('Copied data.js to public/docs-data');

        // Copy any other needed files from the docs directory
        if (fs.existsSync(path.join(DEFAULT_INPUT_PATH, 'config.js'))) {
            await copyFile(
                path.join(DEFAULT_INPUT_PATH, 'config.js'),
                path.join(DATA_PATH, 'config.js')
            );
            console.log('Copied config.js to public/docs-data');
        }

        // Instead of trying to parse the complex data.js content,
        // let's create our own JSON structure by parsing the file manually
        await createSimplifiedComponentIndex();

        console.log('Docs data processing complete!');
    } catch (error) {
        console.error('Error processing docs data:', error);
    }
}

/**
 * Create a simplified component index by manually parsing the data.js file
 * This avoids issues with JSON parsing of complex nested structures
 */
async function createSimplifiedComponentIndex() {
    try {
        const dataJsPath = path.join(DATA_PATH, 'data.js');
        const dataContent = await readFile(dataJsPath, 'utf-8');

        // Extract component names and descriptions using regex
        const componentMatches = Array.from(dataContent.matchAll(/"name":\s*"([^"]+)"[\s\S]*?"description":\s*"([^"]*(?:\\"|[^"])*)"[\s\S]*?"filePath":\s*"([^"]+)"/g));

        if (!componentMatches || componentMatches.length === 0) {
            console.error('Failed to extract component names from data.js');
            return;
        }

        // Find method counts for each component
        const components = componentMatches.map(match => {
            const [_, name, description, filePath] = match;
            // Find the methods array for this component
            const methodCountMatch = new RegExp(`"name":\\s*"${name}"[\\s\\S]*?methods":\\s*\\[([\\s\\S]*?)\\]\\s*(?:,\\s*"childComponents"|\\}\\s*\\})`, 'g').exec(dataContent);

            let methodCount = 0;
            if (methodCountMatch && methodCountMatch[1]) {
                // Count number of "name": patterns in the methods array
                methodCount = (methodCountMatch[1].match(/"name":/g) || []).length;
            }

            return {
                name,
                description: description.replace(/\\n/g, ' ').replace(/\\/g, ''),
                filePath,
                methodCount,
                slug: nameToSlug(name)
            };
        });

        console.log(`Found ${components.length} components`);

        // Write the component index to a JSON file
        await writeFile(
            path.join(DATA_PATH, 'component-index.json'),
            JSON.stringify(components, null, 2)
        );
        console.log('Generated component-index.json');
    } catch (error) {
        console.error('Error creating simplified component index:', error);
    }
}

// Run the main function
processDocsData();
