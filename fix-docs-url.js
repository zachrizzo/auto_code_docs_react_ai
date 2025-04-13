// Simple script to test accessing the documentation files
const fs = require('fs');
const path = require('path');

// Fix the URL paths
const fixDocsUrls = () => {
    try {
        console.log('Fixing documentation URL paths...');

        // Get component index
        const indexPath = path.join(__dirname, 'src/ui/public/docs-data/component-index.json');
        if (!fs.existsSync(indexPath)) {
            console.error('Component index file not found:', indexPath);
            return;
        }

        // Read and parse the index
        const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        console.log(`Found ${index.length} components in index`);

        // Create .env.local file
        const envPath = path.join(__dirname, 'src/ui/.env.local');
        const envContent = `
NEXT_PUBLIC_DOCS_URL=http://localhost:3000
NEXT_PUBLIC_DOCS_PATH=/docs-data
`;

        fs.writeFileSync(envPath, envContent);
        console.log('Created .env.local with configuration');

        console.log('Documentation URL paths fixed');
    } catch (error) {
        console.error('Error fixing documentation URL paths:', error);
    }
};

fixDocsUrls();
