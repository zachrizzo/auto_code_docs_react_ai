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

// Start the server
module.exports = function startServer(options) {
  const {
    port = 4000,
    docsDataDir
  } = options;

  return findAvailablePort(port)
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
      
      // Serve the UI files directly from the src/ui directory
      const uiDir = path.join(__dirname, 'ui');
      app.use(express.static(uiDir));
      
      // Fallback to index.html
      app.get('*', (req, res) => {
        res.sendFile(path.join(uiDir, 'index.html'));
      });
      
      // Start the server
      return app.listen(availablePort, (err) => {
        if (err) throw err;
        console.log('> Documentation server ready on http://localhost:' + availablePort);
        console.log('> Documentation data served from ' + docsDataDir);
        return { port: availablePort };
      });
    });
};
