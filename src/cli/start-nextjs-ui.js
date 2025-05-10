#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const express = require('express');
const http = require('http');

// Parse command line arguments
const args = process.argv.slice(2);
let port = 4000;
let docsDataDir = process.cwd() + '/documentation/docs-data';
let nextjsPort = 3000;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port' && args[i + 1]) {
    port = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--docs-data-dir' && args[i + 1]) {
    docsDataDir = args[i + 1];
    i++;
  } else if (args[i] === '--nextjs-port' && args[i + 1]) {
    nextjsPort = parseInt(args[i + 1], 10);
    i++;
  }
}

// Make sure the docs data directory exists
if (!fs.existsSync(docsDataDir)) {
  console.error('Error: Docs data directory does not exist: ' + docsDataDir);
  console.error('Please run the documentation generator first or specify a valid directory with --docs-data-dir');
  process.exit(1);
}

// Find the UI directory
const packageDir = path.dirname(path.dirname(__dirname));
const uiDir = path.join(packageDir, 'src', 'ui');

if (!fs.existsSync(uiDir)) {
  console.error('Error: UI directory not found at: ' + uiDir);
  process.exit(1);
}

// Start a data server to serve the documentation data
const app = express();

// Serve the docs-data directory
app.use('/docs-data', express.static(docsDataDir));

// Special route to combine all component JSON files into a single array
app.get('/docs-data/components.json', (req, res) => {
  try {
    const componentsArray = [];
    
    // Read all JSON files in the docs-data directory
    const files = fs.readdirSync(docsDataDir);
    
    // Filter for JSON files and exclude special files
    const jsonFiles = files.filter(file => 
      file.endsWith('.json') && 
      !['component-index.json', 'config.json'].includes(file)
    );
    
    // Read each JSON file and add its content to the array
    jsonFiles.forEach(file => {
      try {
        const filePath = path.join(docsDataDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const componentData = JSON.parse(content);
        
        // Add the component name from the filename if not present
        if (!componentData.name) {
          componentData.name = file.replace('.json', '');
        }
        
        componentsArray.push(componentData);
      } catch (err) {
        console.error('Error processing file ' + file + ':', err);
      }
    });
    
    res.json(componentsArray);
  } catch (err) {
    console.error('Error generating components.json:', err);
    res.status(500).json({ error: 'Failed to generate components data' });
  }
});

// Start the data server
const server = app.listen(port, () => {
  console.log('> Documentation data server ready on http://localhost:' + port);
  console.log('> Documentation data served from ' + docsDataDir);
  
  // Create a .env.local file in the UI directory to point to the data server
  const envContent = `NEXT_PUBLIC_DATA_SERVER_URL=http://localhost:${port}\n`;
  fs.writeFileSync(path.join(uiDir, '.env.local'), envContent);
  
  // Start the Next.js dev server
  console.log('Starting Next.js dev server for the UI...');
  console.log('UI directory: ' + uiDir);
  
  // Change to the UI directory and start Next.js
  process.chdir(uiDir);
  
  // Install dependencies if needed
  if (!fs.existsSync(path.join(uiDir, 'node_modules'))) {
    console.log('Installing UI dependencies...');
    try {
      execSync('npm install', { stdio: 'inherit' });
    } catch (error) {
      console.error('Error installing UI dependencies:', error.message);
      process.exit(1);
    }
  }
  
  // Start Next.js dev server
  const nextProcess = spawn('npx', ['next', 'dev', '-p', nextjsPort.toString()], {
    stdio: 'inherit',
    shell: true
  });
  
  nextProcess.on('error', (error) => {
    console.error('Error starting Next.js dev server:', error.message);
    server.close();
    process.exit(1);
  });
  
  nextProcess.on('exit', (code) => {
    console.log('Next.js dev server exited with code ' + code);
    server.close();
    process.exit(code || 0);
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('Shutting down servers...');
    nextProcess.kill();
    server.close();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('Shutting down servers...');
    nextProcess.kill();
    server.close();
    process.exit(0);
  });
});
