#!/usr/bin/env node

const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Find an available port
function findAvailablePort(startPort, maxAttempts = 20) {
  return new Promise((resolve, reject) => {
    let currentPort = startPort;
    let attempts = 0;
    
    function tryPort(port) {
      if (attempts >= maxAttempts) {
        return reject(new Error('Could not find an available port after ' + maxAttempts + ' attempts'));
      }
      
      const server = http.createServer();
      
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log('Port ' + port + ' is already in use, trying next port...');
          attempts++;
          tryPort(port + 1);
        } else {
          reject(err);
        }
      });
      
      server.once('listening', () => {
        server.close(() => {
          resolve(port);
        });
      });
      
      server.listen(port);
    }
    
    tryPort(currentPort);
  });
}

// Parse command line arguments
const args = process.argv.slice(2);
let port = 4000;
let docsDataDir = process.cwd() + '/documentation/docs-data';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port' && args[i + 1]) {
    port = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--docs-data-dir' && args[i + 1]) {
    docsDataDir = args[i + 1];
    i++;
  }
}

// Start the server
console.log('Starting documentation server...');
console.log('Docs data directory: ' + docsDataDir);
console.log('Port: ' + port);

// Make sure the docs data directory exists
if (!fs.existsSync(docsDataDir)) {
  console.error('Error: Docs data directory does not exist: ' + docsDataDir);
  console.error('Please run the documentation generator first or specify a valid directory with --docs-data-dir');
  process.exit(1);
}

// Find an available port and start the server
findAvailablePort(port)
  .then(availablePort => {
    if (availablePort !== port) {
      console.log('Port ' + port + ' was busy, using port ' + availablePort + ' instead');
    }
    
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
    
    // Create a simple HTML UI for viewing components
    app.get('/', (req, res) => {
      try {
        // Generate a simple HTML UI
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Component Documentation</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
    }
    
    .container {
      display: flex;
      min-height: 100vh;
    }
    
    .sidebar {
      width: 250px;
      background-color: #fff;
      border-right: 1px solid #e0e0e0;
      padding: 1rem;
      overflow-y: auto;
    }
    
    .main-content {
      flex: 1;
      padding: 1.5rem;
      overflow-y: auto;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #e0e0e0;
      background-color: #fff;
    }
    
    .nav-item {
      display: block;
      padding: 0.5rem 0.75rem;
      margin-bottom: 0.5rem;
      border-radius: 4px;
      color: #333;
      text-decoration: none;
      transition: background-color 0.2s;
    }
    
    .nav-item:hover {
      background-color: #f0f0f0;
    }
    
    .nav-item.active {
      background-color: #6200ee;
      color: #fff;
    }
    
    .component-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      background-color: #fff;
    }
    
    .component-title {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      color: #6200ee;
    }
    
    .component-description {
      margin-bottom: 1.5rem;
      color: #666;
    }
    
    .props-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .props-table th,
    .props-table td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .props-table th {
      font-weight: 600;
      background-color: #f5f5f5;
    }
    
    .code-block {
      background-color: #f5f5f5;
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
      margin: 1rem 0;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="container">
    <aside class="sidebar" id="sidebar">
      <h2 style="margin-bottom: 1rem;">Components</h2>
      <div id="component-list"></div>
    </aside>
    <div class="main-content">
      <header class="header">
        <h1>Component Documentation</h1>
      </header>
      <div id="component-details"></div>
    </div>
  </div>

  <script>
    // Load components data
    fetch('/docs-data/components.json')
      .then(response => response.json())
      .then(components => {
        // Sort components alphabetically by name
        components.sort((a, b) => a.name.localeCompare(b.name));
        
        // Render component list in sidebar
        const componentList = document.getElementById('component-list');
        components.forEach(component => {
          const navItem = document.createElement('a');
          navItem.className = 'nav-item';
          navItem.href = '#' + component.name;
          navItem.textContent = component.name;
          navItem.onclick = (e) => {
            e.preventDefault();
            renderComponentDetails(component);
            
            // Update active state
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            navItem.classList.add('active');
          };
          componentList.appendChild(navItem);
        });
        
        // Render first component by default
        if (components.length > 0) {
          renderComponentDetails(components[0]);
          // Set the first nav item as active
          const firstNavItem = document.querySelector('.nav-item');
          if (firstNavItem) {
            firstNavItem.classList.add('active');
          }
        }
      })
      .catch(error => {
        console.error('Error loading components:', error);
        document.getElementById('component-details').innerHTML = '<div class="component-card"><h2 class="component-title">Error</h2><p>Failed to load component data. Please check the console for details.</p></div>';
      });
    
    function renderComponentDetails(component) {
      const detailsContainer = document.getElementById('component-details');
      detailsContainer.innerHTML = '';
      
      const card = document.createElement('div');
      card.className = 'component-card';
      
      // Component title
      const title = document.createElement('h2');
      title.className = 'component-title';
      title.textContent = component.name;
      card.appendChild(title);
      
      // Component description
      if (component.description) {
        const description = document.createElement('div');
        description.className = 'component-description';
        description.innerHTML = component.description;
        card.appendChild(description);
      }
      
      // Props table
      if (component.props && component.props.length > 0) {
        const propsTitle = document.createElement('h3');
        propsTitle.textContent = 'Props';
        propsTitle.style.marginTop = '1.5rem';
        propsTitle.style.marginBottom = '0.75rem';
        card.appendChild(propsTitle);
        
        const table = document.createElement('table');
        table.className = 'props-table';
        
        // Table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        ['Name', 'Type', 'Default', 'Description'].forEach(text => {
          const th = document.createElement('th');
          th.textContent = text;
          headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Table body
        const tbody = document.createElement('tbody');
        component.props.forEach(prop => {
          const row = document.createElement('tr');
          
          // Name
          const nameCell = document.createElement('td');
          nameCell.textContent = prop.name;
          row.appendChild(nameCell);
          
          // Type
          const typeCell = document.createElement('td');
          typeCell.textContent = prop.type || '-';
          row.appendChild(typeCell);
          
          // Default
          const defaultCell = document.createElement('td');
          defaultCell.textContent = prop.defaultValue || '-';
          row.appendChild(defaultCell);
          
          // Description
          const descCell = document.createElement('td');
          descCell.textContent = prop.description || '-';
          row.appendChild(descCell);
          
          tbody.appendChild(row);
        });
        table.appendChild(tbody);
        card.appendChild(table);
      }
      
      // Example usage
      if (component.examples && component.examples.length > 0) {
        const examplesTitle = document.createElement('h3');
        examplesTitle.textContent = 'Examples';
        examplesTitle.style.marginTop = '1.5rem';
        examplesTitle.style.marginBottom = '0.75rem';
        card.appendChild(examplesTitle);
        
        component.examples.forEach(example => {
          const codeBlock = document.createElement('pre');
          codeBlock.className = 'code-block';
          codeBlock.textContent = example.code;
          card.appendChild(codeBlock);
        });
      }
      
      detailsContainer.appendChild(card);
    }
  </script>
</body>
</html>
`;
        
        res.send(html);
      } catch (err) {
        console.error('Error generating UI:', err);
        res.status(500).send('Error generating documentation UI');
      }
    });
    
    // Start the server
    app.listen(availablePort, (err) => {
      if (err) throw err;
      console.log('> Documentation server ready on http://localhost:' + availablePort);
      console.log('> Documentation data served from ' + docsDataDir);
    });
  })
  .catch(err => {
    console.error('Error starting documentation server:', err);
    process.exit(1);
  });
